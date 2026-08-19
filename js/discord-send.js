/* Prime Blog — Discord webhook helper
   - Attaches logo automatically (thumbnail / author icon)
   - Optional embed image + extra file attachments from announce form
   - avatar_url always uses a public HTTPS URL (Discord rejects attachment:// there)
*/
(function (global) {
  var LOGO_CANDIDATES = [
    "images/logo-prime.png",
    "images/proh1t.png",
    "images/pt-logo.png",
    "images/logo-prime.png",
    "./images/proh1t.png",
    "./images/pt-logo.png"
  ];

  function cfg() {
    return global.PB_DISCORD || {};
  }

  function loadLogoBlob() {
    var i = 0;
    function next() {
      if (i >= LOGO_CANDIDATES.length) return Promise.resolve(null);
      var path = LOGO_CANDIDATES[i++];
      return fetch(path, { cache: "no-cache" })
        .then(function (r) {
          if (!r.ok) return next();
          return r.blob().then(function (b) {
            if (!b || b.size < 50) return next();
            var name = path.split("/").pop() || "logo.png";
            if (b.type === "image/png" && !/\.png$/i.test(name)) name = "logo.png";
            if ((b.type === "image/jpeg" || b.type === "image/jpg") && !/\.jpe?g$/i.test(name))
              name = "logo.jpg";
            return { blob: b, name: name };
          });
        })
        .catch(function () {
          return next();
        });
    }
    return next();
  }

  function publicLogoUrl() {
    var c = cfg();
    return (
      c.logoUrl ||
      c.brandLogoUrl ||
      (c.siteUrl ? c.siteUrl + "/images/pt-logo.png" : "") ||
      "https://nemmartv.github.io/main1/images/pt-logo.png"
    );
  }

  /** avatar_url must be HTTPS — never attachment:// */
  function applyPublicAvatar(body, url) {
    if (!url) return body;
    body.avatar_url = url;
    return body;
  }

  /** thumbnail / author icon may use attachment:// or HTTPS */
  function applyEmbedLogo(body, url) {
    if (!url) return body;
    if (!body.embeds || !body.embeds[0]) return body;
    var embed = body.embeds[0];
    embed.thumbnail = { url: url };
    embed.author = embed.author || { name: body.username || "Prime Blog" };
    embed.author.icon_url = url;
    if (!embed.author.name) embed.author.name = body.username || "Prime Blog";
    body.embeds[0] = embed;
    return body;
  }

  function sanitizeName(name, fallback) {
    var n = String(name || fallback || "file").replace(/[^\w.\-]+/g, "_");
    if (!n || n === "." || n === "..") n = fallback || "file";
    return n;
  }

  function ensureImageExt(name, file) {
    if (/\.(png|jpe?g|gif|webp)$/i.test(name)) return name;
    var t = (file && file.type) || "";
    if (t.indexOf("png") >= 0) return name + ".png";
    if (t.indexOf("gif") >= 0) return name + ".gif";
    if (t.indexOf("webp") >= 0) return name + ".webp";
    return name + ".jpg";
  }

  /**
   * @param {string} webhook
   * @param {object} payload - Discord webhook JSON
   * @param {object} [options]
   * @param {File|Blob} [options.imageFile] - optional image to show in embed
   * @param {string} [options.imageName]
   * @param {File[]} [options.extraFiles] - optional other attachments
   */
  function sendWebhook(webhook, payload, options) {
    if (!webhook) return Promise.reject(new Error("Missing webhook URL"));
    options = options || {};

    var pub = publicLogoUrl();
    var base = JSON.parse(JSON.stringify(payload || {}));
    base = applyPublicAvatar(base, pub);
    base = applyEmbedLogo(base, pub);

    return loadLogoBlob().then(function (logo) {
      var body = JSON.parse(JSON.stringify(base));
      var fd = new FormData();
      var fileIndex = 0;
      var usedNames = {};

      function uniqueName(name) {
        var n = name;
        var k = 1;
        while (usedNames[n.toLowerCase()]) {
          var parts = name.split(".");
          if (parts.length > 1) {
            var ext = parts.pop();
            n = parts.join(".") + "_" + k + "." + ext;
          } else {
            n = name + "_" + k;
          }
          k++;
        }
        usedNames[n.toLowerCase()] = true;
        return n;
      }

      // Logo as attachment → embed thumbnail / author icon only
      // avatar_url stays on public HTTPS URL
      if (logo && logo.blob && logo.blob.size > 0) {
        var logoName = uniqueName(sanitizeName(logo.name, "logo.png"));
        body = applyEmbedLogo(body, "attachment://" + logoName);
        fd.append("files[" + fileIndex + "]", logo.blob, logoName);
        fileIndex++;
      }

      // User image → large embed image
      var imgFile = options.imageFile;
      if (imgFile && imgFile.size > 0) {
        var imgName = sanitizeName(
          options.imageName || imgFile.name || "image.png",
          "image.png"
        );
        imgName = ensureImageExt(imgName, imgFile);
        imgName = uniqueName(imgName);

        if (!body.embeds) body.embeds = [{}];
        if (!body.embeds[0]) body.embeds[0] = {};
        body.embeds[0].image = { url: "attachment://" + imgName };

        fd.append("files[" + fileIndex + "]", imgFile, imgName);
        fileIndex++;
      }

      // Extra files as message attachments (not embed image)
      var extras = options.extraFiles || [];
      for (var i = 0; i < extras.length; i++) {
        var f = extras[i];
        if (!f || !f.size) continue;
        var n = uniqueName(sanitizeName(f.name || "file_" + i, "file_" + i));
        fd.append("files[" + fileIndex + "]", f, n);
        fileIndex++;
      }

      function postJson(jsonBody) {
        return fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(jsonBody)
        });
      }

      function postMultipart(form, jsonBody) {
        // Rebuild FormData with current payload_json so callers can retry with tweaked body
        var fd2 = new FormData();
        // Copy existing file parts from form
        // FormData from previous build — append payload_json last
        form.forEach(function (value, key) {
          if (key === "payload_json") return;
          fd2.append(key, value);
        });
        fd2.append("payload_json", JSON.stringify(jsonBody));
        return fetch(webhook, { method: "POST", body: fd2 });
      }

      if (fileIndex > 0) {
        fd.append("payload_json", JSON.stringify(body));
        return fetch(webhook, { method: "POST", body: fd }).then(function (res) {
          if (res.ok || res.status === 204) return res;

          // 400/413: try once more with files but public logo only (no attachment:// logo)
          if (res.status === 400 || res.status === 413) {
            return res.text().then(function (errTxt) {
              var bodyRetry = JSON.parse(JSON.stringify(base));
              // Keep public logo for thumbnail/avatar; still attach user image + extras
              var fdRetry = new FormData();
              var idx = 0;
              var names = {};

              function uniq(name) {
                var n = name;
                var k = 1;
                while (names[n.toLowerCase()]) {
                  var parts = name.split(".");
                  if (parts.length > 1) {
                    var ext = parts.pop();
                    n = parts.join(".") + "_" + k + "." + ext;
                  } else n = name + "_" + k;
                  k++;
                }
                names[n.toLowerCase()] = true;
                return n;
              }

              if (imgFile && imgFile.size > 0) {
                var iname = sanitizeName(
                  options.imageName || imgFile.name || "image.png",
                  "image.png"
                );
                iname = ensureImageExt(iname, imgFile);
                iname = uniq(iname);
                if (!bodyRetry.embeds) bodyRetry.embeds = [{}];
                if (!bodyRetry.embeds[0]) bodyRetry.embeds[0] = {};
                bodyRetry.embeds[0].image = { url: "attachment://" + iname };
                fdRetry.append("files[" + idx + "]", imgFile, iname);
                idx++;
              }

              for (var j = 0; j < extras.length; j++) {
                var xf = extras[j];
                if (!xf || !xf.size) continue;
                var xn = uniq(sanitizeName(xf.name || "file_" + j, "file_" + j));
                fdRetry.append("files[" + idx + "]", xf, xn);
                idx++;
              }

              if (idx === 0) {
                // Nothing left to attach — fall back to JSON only
                return postJson(bodyRetry);
              }

              fdRetry.append("payload_json", JSON.stringify(bodyRetry));
              return fetch(webhook, { method: "POST", body: fdRetry }).then(function (res2) {
                if (res2.ok || res2.status === 204) return res2;
                // Last resort: post without any files so the text still goes through
                return res2.text().then(function (txt2) {
                  return postJson(bodyRetry).then(function (res3) {
                    // Mark that files were dropped so UI can warn
                    if (res3.ok || res3.status === 204) {
                      res3._pbFilesDropped = true;
                      res3._pbFileError = txt2 || errTxt;
                    }
                    return res3;
                  });
                });
              });
            });
          }
          return res;
        });
      }

      return postJson(body);
    });
  }

  function okResponse(res) {
    if (!res) throw new Error("No response");
    if (res.status === 204 || res.status === 200 || res.ok) return res;
    return res.text().then(function (txt) {
      throw new Error("Discord " + res.status + (txt ? ": " + String(txt).slice(0, 200) : ""));
    });
  }

  global.PB_DISCORD_SEND = {
    send: sendWebhook,
    ok: okResponse,
    loadLogo: loadLogoBlob
  };
})(window);
