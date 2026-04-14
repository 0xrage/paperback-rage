var _Sources = (() => {
  var ATSU_BASE = "https://atsu.moe";
  var LANG = "\u{1F1EC}\u{1F1E7}";
  var HOME_SECTION_TYPE = "singleRowNormal";
  var AtsumaruInfo = {
    version: "1.0.1",
    name: "Atsumaru",
    icon: "icon.png",
    author: "0xRage",
    authorWebsite: "https://github.com/openai",
    description: "Extension that pulls manga from atsu.moe",
    contentRating: "MATURE",
    websiteBaseURL: ATSU_BASE,
    sourceTags: [],
    intents: 5
  };

  function normalizeUrl(url) {
    if (!url) {
      return "";
    }

    var cleaned = String(url).trim();
    if (!cleaned) {
      return "";
    }

    if (cleaned.indexOf("//") === 0) {
      cleaned = "https:" + cleaned;
    }

    if (/^https?:\/\//i.test(cleaned)) {
      return cleaned.replace(/^(https?:\/\/[^\/]+)\/+/, "$1/");
    }

    if (cleaned.charAt(0) !== "/") {
      cleaned = "/" + cleaned;
    }

    return ATSU_BASE + cleaned;
  }

  function normalizeStaticAssetUrl(url) {
    if (!url) {
      return "";
    }

    var cleaned = String(url).trim();
    if (!cleaned) {
      return "";
    }

    if (/^https?:\/\//i.test(cleaned) || cleaned.indexOf("//") === 0) {
      return normalizeUrl(cleaned);
    }

    if (cleaned.indexOf("/static/") === 0) {
      return normalizeUrl(cleaned);
    }

    if (cleaned.indexOf("static/") === 0) {
      return normalizeUrl("/" + cleaned);
    }

    return normalizeUrl("/static/" + cleaned.replace(/^\/+/, ""));
  }

  function buildQueryString(params) {
    var pairs = [];
    for (var key in params) {
      if (!Object.prototype.hasOwnProperty.call(params, key)) {
        continue;
      }

      var value = params[key];
      if (value === undefined || value === null || value === "") {
        continue;
      }

      pairs.push(encodeURIComponent(key) + "=" + encodeURIComponent(String(value)));
    }

    return pairs.join("&");
  }

  function cleanText(text) {
    if (!text) {
      return "";
    }

    return String(text)
      .replace(/\r/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cleanDescription(text) {
    if (!text) {
      return "";
    }

    return String(text)
      .replace(/\r/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function humanize(value) {
    if (!value) {
      return "";
    }

    return String(value)
      .replace(/[_-]+/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, function(character) {
        return character.toUpperCase();
      })
      .trim();
  }

  function toNumber(value) {
    var parsed = Number(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  function normalizeStatus(status) {
    switch (String(status || "").toUpperCase()) {
      case "ONGOING":
        return "Ongoing";
      case "COMPLETED":
        return "Completed";
      case "HIATUS":
        return "Hiatus";
      case "CANCELLED":
        return "Cancelled";
      default:
        return humanize(status) || "Unknown";
    }
  }

  function normalizeSeriesType(seriesType) {
    switch (String(seriesType || "").toUpperCase()) {
      case "MANWHA":
      case "MANHWA":
        return "Manhwa";
      case "MANHUA":
        return "Manhua";
      case "MANGA":
        return "Manga";
      case "OEL":
        return "OEL";
      default:
        return humanize(seriesType);
    }
  }

  function slugify(value) {
    return cleanText(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function uniqueValues(values) {
    var seen = {};
    var output = [];

    for (var index = 0; index < values.length; index += 1) {
      var value = cleanText(values[index]);
      var key = value.toLowerCase();
      if (!value || seen[key]) {
        continue;
      }

      seen[key] = true;
      output.push(value);
    }

    return output;
  }

  function extractName(entry) {
    if (!entry) {
      return "";
    }

    if (typeof entry === "string") {
      return cleanText(entry);
    }

    if (typeof entry === "object") {
      return cleanText(entry.name || entry.title || entry.value);
    }

    return "";
  }

  function buildTitles(page) {
    var values = [page && page.title, page && page.englishTitle];
    if (Array.isArray(page && page.otherNames)) {
      values = values.concat(page.otherNames);
    }

    return uniqueValues(values);
  }

  function buildCoverImage(item) {
    if (!item) {
      return "";
    }

    if (typeof item === "string") {
      return normalizeStaticAssetUrl(item);
    }

    return normalizeStaticAssetUrl(item.largeImage || item.mediumImage || item.smallImage || item.image);
  }

  function buildSubtitle(item) {
    var parts = [];

    if (item && item.type) {
      parts.push(normalizeSeriesType(item.type));
    }

    return parts.join(" · ");
  }

  function buildPartialSourceManga(item) {
    return App.createPartialSourceManga({
      mangaId: item.id,
      image: buildCoverImage(item && (item.poster || item)),
      title: cleanText(item.title),
      subtitle: buildSubtitle(item)
    });
  }

  function buildTagSections(page) {
    var sections = [];

    if (Array.isArray(page && page.genres) && page.genres.length) {
      sections.push(
        App.createTagSection({
          id: "genres",
          label: "genres",
          tags: page.genres
            .filter(function(genre) {
              return genre && genre.id !== undefined && extractName(genre);
            })
            .map(function(genre) {
              return App.createTag({
                id: String(genre.id),
                label: extractName(genre)
              });
            })
        })
      );
    }

    var infoTags = [];
    if (page && page.type) {
      infoTags.push(
        App.createTag({
          id: "type:" + page.type,
          label: normalizeSeriesType(page.type)
        })
      );
    }

    if (page && page.status) {
      infoTags.push(
        App.createTag({
          id: "status:" + page.status,
          label: normalizeStatus(page.status)
        })
      );
    }

    if (page && page.isAdult === true) {
      infoTags.push(
        App.createTag({
          id: "adult",
          label: "Mature"
        })
      );
    }

    if (page && page.released) {
      var releaseYear = new Date(toNumber(page.released)).getUTCFullYear();
      if (!isNaN(releaseYear) && releaseYear > 1900) {
        infoTags.push(
          App.createTag({
            id: "year:" + releaseYear,
            label: String(releaseYear)
          })
        );
      }
    }

    if (infoTags.length) {
      sections.push(
        App.createTagSection({
          id: "info",
          label: "info",
          tags: infoTags
        })
      );
    }

    if (Array.isArray(page && page.scanlators) && page.scanlators.length) {
      sections.push(
        App.createTagSection({
          id: "scanlators",
          label: "scanlators",
          tags: page.scanlators
            .filter(function(scanlator) {
              return scanlator && scanlator.id !== undefined && extractName(scanlator);
            })
            .map(function(scanlator) {
              return App.createTag({
                id: String(scanlator.id),
                label: extractName(scanlator)
              });
            })
        })
      );
    }

    return sections;
  }

  function buildScanlatorMap(scanlators) {
    var mapping = {};

    if (!Array.isArray(scanlators)) {
      return mapping;
    }

    for (var index = 0; index < scanlators.length; index += 1) {
      var scanlator = scanlators[index];
      if (!scanlator || scanlator.id === undefined) {
        continue;
      }

      var name = extractName(scanlator);
      if (!name) {
        continue;
      }

      mapping[String(scanlator.id)] = name;
    }

    return mapping;
  }

  function buildDuplicateChapterMap(chapters) {
    var counts = {};

    for (var index = 0; index < chapters.length; index += 1) {
      var chapter = chapters[index];
      if (!chapter || chapter.number === undefined || chapter.number === null || chapter.number === "") {
        continue;
      }

      var key = String(chapter.number);
      counts[key] = (counts[key] || 0) + 1;
    }

    return counts;
  }

  function buildChapterName(chapter, scanlatorMap, duplicateMap) {
    if (!chapter) {
      return "Chapter";
    }

    var name = cleanText(chapter.title);
    if (!name) {
      name = chapter.number !== undefined && chapter.number !== null && chapter.number !== ""
        ? "Chapter " + chapter.number
        : "Chapter";
    }

    var chapterKey = chapter.number !== undefined && chapter.number !== null && chapter.number !== ""
      ? String(chapter.number)
      : "";
    var scanlatorName = scanlatorMap[String(chapter.scanlationMangaId)] || "";

    if (chapterKey && duplicateMap[chapterKey] > 1 && scanlatorName) {
      name += " (" + scanlatorName + ")";
    }

    return name;
  }

  function compareChaptersDescending(left, right) {
    var numberDifference = toNumber(right && right.number) - toNumber(left && left.number);
    if (numberDifference !== 0) {
      return numberDifference;
    }

    var rightTime = toNumber(right && right.createdAt);
    var leftTime = toNumber(left && left.createdAt);
    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }

    return toNumber(right && right.index) - toNumber(left && left.index);
  }

  function createHomeSection(section) {
    return App.createHomeSection({
      id: section.key || slugify(section.title),
      title: cleanText(section.title),
      containsMoreItems: false,
      type: HOME_SECTION_TYPE
    });
  }

  function validateResponse(response) {
    if (response.status >= 200 && response.status < 300) {
      return;
    }

    if (response.status === 404) {
      throw new Error("Atsumaru returned 404 for " + response.request.url);
    }

    if (response.status === 403 || response.status === 429 || response.status === 503) {
      throw new Error("Atsumaru blocked the request. Try again later.");
    }

    throw new Error("Atsumaru returned " + response.status + " for " + response.request.url);
  }

  function buildDescription(page) {
    var description = cleanDescription(page && page.synopsis);
    var otherNames = uniqueValues((page && page.otherNames) || []).filter(function(name) {
      return name.toLowerCase() !== cleanText(page && page.title).toLowerCase();
    });

    if (otherNames.length) {
      description += (description ? "\n\n" : "") + "Alternative Titles: " + otherNames.join(", ");
    }

    return description;
  }

  var Atsumaru = class {
    constructor() {
      this.requestManager = App.createRequestManager({
        requestsPerSecond: 4,
        requestTimeout: 20000,
        interceptor: {
          interceptRequest: async (request) => {
            request.headers = Object.assign({}, request.headers || {}, {
              accept: "application/json, text/plain, */*",
              origin: ATSU_BASE,
              referer: ATSU_BASE + "/",
              "accept-language": "en-US,en;q=0.9",
              "user-agent": await this.requestManager.getDefaultUserAgent()
            });
            return request;
          },
          interceptResponse: async (response) => response
        }
      });
    }

    getMangaShareUrl(mangaId) {
      return ATSU_BASE + "/manga/" + mangaId;
    }

    async getMangaDetails(mangaId) {
      var page = await this.fetchMangaPage(mangaId);
      var authors = uniqueValues((page.authors || []).map(extractName));

      return App.createSourceManga({
        id: mangaId,
        mangaInfo: App.createMangaInfo({
          titles: buildTitles(page),
          image: buildCoverImage(page.poster),
          rating: toNumber(page.avgRating),
          status: normalizeStatus(page.status),
          author: authors.join(", "),
          artist: "",
          tags: buildTagSections(page),
          desc: buildDescription(page)
        })
      });
    }

    async getChapters(mangaId) {
      var page = await this.fetchMangaPage(mangaId);
      var allChapters = await this.fetchAllChapters(mangaId);
      var chapters = Array.isArray(allChapters) && allChapters.length
        ? allChapters.filter(function(chapter) {
            return chapter && chapter.id;
          }).slice()
        : Array.isArray(page.chapters)
          ? page.chapters.filter(function(chapter) {
            return chapter && chapter.id;
          }).slice()
          : [];

      chapters.sort(compareChaptersDescending);

      if (!chapters.length) {
        throw new Error("No chapters were found for " + mangaId);
      }

      var scanlatorMap = buildScanlatorMap(page.scanlators);
      var duplicateMap = buildDuplicateChapterMap(chapters);

      return chapters.map(function(chapter) {
        return App.createChapter({
          id: chapter.id,
          name: buildChapterName(chapter, scanlatorMap, duplicateMap),
          langCode: LANG,
          chapNum: toNumber(chapter.number),
          volume: 0,
          time: chapter.createdAt ? new Date(toNumber(chapter.createdAt)) : undefined
        });
      });
    }

    async getChapterDetails(mangaId, chapterId) {
      var payload = await this.fetchJson(
        ATSU_BASE + "/api/read/chapter?" + buildQueryString({
          mangaId: mangaId,
          chapterId: chapterId
        })
      );
      var chapter = payload.readChapter || payload.chapter || payload;
      var pages = Array.isArray(chapter && chapter.pages) ? chapter.pages.slice() : [];

      pages.sort(function(left, right) {
        return toNumber(left && left.number) - toNumber(right && right.number);
      });

      var imageUrls = pages
        .map(function(page) {
          return normalizeUrl(page && (page.image || page.url));
        })
        .filter(Boolean);

      if (!imageUrls.length) {
        throw new Error("No pages were found for " + mangaId + "/" + chapterId);
      }

      return App.createChapterDetails({
        id: chapterId,
        mangaId: mangaId,
        pages: imageUrls
      });
    }

    async getSearchResults(query) {
      var title = query && query.title ? cleanText(query.title) : "";
      if (!title) {
        return App.createPagedResults({
          results: []
        });
      }

      var payload = await this.fetchJson(
        ATSU_BASE + "/api/search/page?" + buildQueryString({ query: title })
      );
      var hits = Array.isArray(payload && payload.hits)
        ? payload.hits.filter(function(hit) {
            return hit && hit.id && cleanText(hit.title);
          })
        : [];

      return App.createPagedResults({
        results: hits.map(buildPartialSourceManga)
      });
    }

    async getHomePageSections(sectionCallback) {
      var payload = await this.fetchJson(ATSU_BASE + "/api/home/page");
      var sourceSections = Array.isArray(payload && payload.homePage && payload.homePage.sections)
        ? payload.homePage.sections.filter(function(section) {
            return section && cleanText(section.title) && Array.isArray(section.items) && section.items.length;
          })
        : [];
      var sections = [];

      for (var index = 0; index < sourceSections.length; index += 1) {
        var sourceSection = sourceSections[index];
        var section = createHomeSection(sourceSection);
        sections.push(section);
        sectionCallback(section);
      }

      for (var sectionIndex = 0; sectionIndex < sourceSections.length; sectionIndex += 1) {
        sections[sectionIndex].items = sourceSections[sectionIndex].items
          .filter(function(item) {
            return item && item.id && cleanText(item.title);
          })
          .map(buildPartialSourceManga);
        sectionCallback(sections[sectionIndex]);
      }
    }

    async getViewMoreItems() {
      throw new Error("Atsumaru does not expose paginated browse results through its public API.");
    }

    async fetchMangaPage(mangaId) {
      var payload = await this.fetchJson(
        ATSU_BASE + "/api/manga/page?" + buildQueryString({ id: mangaId })
      );
      var page = payload && payload.mangaPage ? payload.mangaPage : null;

      if (!page || !page.id) {
        throw new Error("Atsumaru returned an invalid manga payload for " + mangaId);
      }

      return page;
    }

    async fetchAllChapters(mangaId) {
      var payload = await this.fetchJson(
        ATSU_BASE + "/api/manga/allChapters?" + buildQueryString({ mangaId: mangaId })
      );
      return Array.isArray(payload && payload.chapters) ? payload.chapters : [];
    }

    async fetchJson(url) {
      var response = await this.scheduleRequest(url);
      return typeof response.data === "string" ? JSON.parse(response.data) : response.data;
    }

    async scheduleRequest(url) {
      var request = App.createRequest({
        url: url,
        method: "GET"
      });
      var response = await this.requestManager.schedule(request, 1);
      validateResponse(response);
      return response;
    }
  };

  return {
    Atsumaru: Atsumaru,
    AtsumaruInfo: AtsumaruInfo
  };
})();

this.Sources = _Sources;
if (typeof exports === "object" && typeof module !== "undefined") {
  module.exports.Sources = this.Sources;
}
