/* Prime Blog — Discord webhook helper
   - Attaches logo automatically
   - Optional extra image/file from form (announcements) */
(function (global) {
  var LOGO_CANDIDATES = [
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

  function applyLogoUrls(body, url) {
    if (!url) return body;
    body.avatar_url = url;
    if (!body.embeds || !body.embeds[0]) return body;
    var embed = body.embeds[0];
    embed.thumbnail = { url: url };
    embed.author = embed.author || { name: body.username || "Prime Blog" };
    embed.author.icon_url = url;
    if (!embed.author.name) embed.author.name = body.username || "Prime Blog";
    body.embeds[0] = embed;
    return body;
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

    var body = JSON.parse(JSON.stringify(payload || {}));
    var pub = publicLogoUrl();
    body = applyLogoUrls(body, pub);

    return loadLogoBlob().then(function (logo) {
      var fd = new FormData();
      var fileIndex = 0;

      // Logo as attachment → thumbnail/avatar
      if (logo) {
        var logoAtt = "attachment://" + logo.name;
        body = applyLogoUrls(body, logoAtt);
        fd.append("files[" + fileIndex + "]", logo.blob, logo.name);
        fileIndex++;
      }

      // User image → large embed image
      var imgFile = options.imageFile;
      if (imgFile && imgFile.size > 0) {
        var imgName = options.imageName || imgFile.name || "image.png";
        // sanitize name
        imgName = String(imgName).replace(/[^\w.\-]+/g, "_");
        if (!/\.(png|jpe?g|gif|webp)$/i.test(imgName)) {
          var t = imgFile.type || "";
          if (t.indexOf("png") >= 0) imgName += ".png";
          else if (t.indexOf("gif") >= 0) imgName += ".gif";
          else if (t.indexOf("webp") >= 0) imgName += ".webp";
          else imgName += ".jpg";
        }
        // avoid collision with logo filename
        if (logo && imgName === logo.name) imgName = "embed_" + imgName;

        if (!body.embeds) body.embeds = [{}];
        if (!body.embeds[0]) body.embeds[0] = {};
        body.embeds[0].image = { url: "attachment://" + imgName };

        fd.append("files[" + fileIndex + "]", imgFile, imgName);
        fileIndex++;
      }

      // Extra files (non-image) as plain attachments
      var extras = options.extraFiles || [];
      for (var i = 0; i < extras.length; i++) {
        var f = extras[i];
        if (!f || !f.size) continue;
        var n = String(f.name || "file_" + i).replace(/[^\w.\-]+/g, "_");
        fd.append("files[" + fileIndex + "]", f, n);
        fileIndex++;
      }

      if (fileIndex > 0) {
        fd.append("payload_json", JSON.stringify(body));
        return fetch(webhook, { method: "POST", body: fd }).then(function (res) {
          if (res.status === 400 || res.status === 413) {
            // Retry without files, public logo only
            var body2 = JSON.parse(JSON.stringify(payload || {}));
            body2 = applyLogoUrls(body2, pub);
            return fetch(webhook, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body2)
            });
          }
          return res;
        });
      }

      return fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
    });
  }

  function okResponse(res) {
    if (!res) throw new Error("No response");
    if (res.status === 204 || res.status === 200 || res.ok) return res;
    return res.text().then(function (txt) {
      throw new Error("Discord " + res.status + (txt ? ": " + String(txt).slice(0, 160) : ""));
    });
  }

  global.PB_DISCORD_SEND = {
    send: sendWebhook,
    ok: okResponse,
    loadLogo: loadLogoBlob
  };
})(window);
