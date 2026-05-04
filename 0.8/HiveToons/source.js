var _Sources = (() => {
  var HIVE_BASE = "https://hivetoons.org";
  var HIVE_API = "https://api.hivetoons.org";
  var LANG = "\u{1F1EC}\u{1F1E7}";
  var HOME_SECTION_TYPE = "singleRowNormal";
  var HOME_SECTIONS = [
    {
      id: "latest",
      title: "Recently Updated",
      orderBy: "lastChapterAddedAt",
      orderDirection: "desc"
    },
    {
      id: "popular",
      title: "Popular",
      orderBy: "totalViews",
      orderDirection: "desc"
    },
    {
      id: "newest",
      title: "New Series",
      orderBy: "createdAt",
      orderDirection: "desc"
    }
  ];
  var HiveToonsInfo = {
    version: "1.0.5",
    name: "HiveToons",
    icon: "icon.webp",
    author: "0xRage",
    authorWebsite: "https://github.com/openai",
    description: "Extension that pulls manga from hivetoons.org",
    contentRating: "MATURE",
    websiteBaseURL: HIVE_BASE,
    sourceTags: [],
    intents: 53
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
      return cleaned;
    }

    if (cleaned.charAt(0) !== "/") {
      cleaned = "/" + cleaned;
    }

    return HIVE_BASE + cleaned;
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

  function decodeHtmlEntities(text) {
    if (!text) {
      return "";
    }

    return String(text)
      .replace(/&nbsp;/gi, " ")
      .replace(/&quot;/gi, "\"")
      .replace(/&#39;/gi, "'")
      .replace(/&apos;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&amp;/gi, "&");
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

  function cleanDescription(text) {
    if (!text) {
      return "";
    }

    return decodeHtmlEntities(
      String(text)
        .replace(/\r/g, "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<[^>]+>/g, "")
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
    ).trim();
  }

  function toNumber(value) {
    var parsed = Number(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  function compareChaptersDescending(left, right) {
    var numberDifference = toNumber(right && right.number) - toNumber(left && left.number);
    if (numberDifference !== 0) {
      return numberDifference;
    }

    var rightTime = right && right.createdAt ? new Date(right.createdAt).getTime() : 0;
    var leftTime = left && left.createdAt ? new Date(left.createdAt).getTime() : 0;
    return rightTime - leftTime;
  }

  function latestAccessibleChapter(chapters) {
    if (!Array.isArray(chapters)) {
      return null;
    }

    var accessible = chapters.filter(function(chapter) {
      return chapter && chapter.slug && chapter.isAccessible !== false;
    });

    if (!accessible.length) {
      return null;
    }

    accessible.sort(compareChaptersDescending);
    return accessible[0] || null;
  }

  function buildChapterName(chapter) {
    if (!chapter) {
      return "Chapter";
    }

    var label = "Chapter";
    if (chapter.number !== undefined && chapter.number !== null && chapter.number !== "") {
      label += " " + chapter.number;
    } else if (chapter.slug) {
      label = humanize(String(chapter.slug).replace(/^chapter[-_]?/i, "Chapter "));
    }

    if (chapter.title) {
      label += ": " + String(chapter.title).trim();
    }

    return label.trim();
  }

  function buildSubtitle(post) {
    var latest = latestAccessibleChapter(post && post.chapters);
    if (latest) {
      return buildChapterName(latest);
    }

    var parts = [];
    if (post && post.seriesType) {
      parts.push(humanize(post.seriesType));
    }
    if (post && post.averageRating) {
      parts.push(String(post.averageRating));
    }
    return parts.join(" · ");
  }

  function buildTagSections(post) {
    var sections = [];

    if (Array.isArray(post && post.genres) && post.genres.length) {
      sections.push(
        App.createTagSection({
          id: "genres",
          label: "genres",
          tags: post.genres
            .filter(function(genre) {
              return genre && genre.id !== undefined && genre.name;
            })
            .map(function(genre) {
              return App.createTag({
                id: String(genre.id),
                label: genre.name
              });
            })
        })
      );
    }

    var infoTags = [];
    if (post && post.seriesType) {
      infoTags.push(
        App.createTag({
          id: "type:" + post.seriesType,
          label: humanize(post.seriesType)
        })
      );
    }
    if (post && post.seriesStatus) {
      infoTags.push(
        App.createTag({
          id: "status:" + post.seriesStatus,
          label: normalizeStatus(post.seriesStatus)
        })
      );
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

    return sections;
  }

  function buildPartialSourceManga(post) {
    return App.createPartialSourceManga({
      mangaId: post.slug,
      image: normalizeUrl(post.featuredImage),
      title: post.postTitle,
      subtitle: buildSubtitle(post)
    });
  }

  function uniqueList(values) {
    var seen = {};
    var output = [];

    for (var index = 0; index < values.length; index += 1) {
      var value = values[index];
      if (!value || seen[value]) {
        continue;
      }

      seen[value] = true;
      output.push(value);
    }

    return output;
  }

  function extractEncodedStringValue(encodedHtml, key) {
    if (!encodedHtml) {
      return "";
    }

    var token = "&quot;" + key + "&quot;:[0,&quot;";
    var startIndex = encodedHtml.indexOf(token);
    if (startIndex === -1) {
      return "";
    }

    startIndex += token.length;
    var endIndex = encodedHtml.indexOf("&quot;]", startIndex);
    if (endIndex === -1) {
      return "";
    }

    return decodeHtmlEntities(encodedHtml.substring(startIndex, endIndex));
  }

  function extractEncodedNumberValue(encodedHtml, key) {
    if (!encodedHtml) {
      return 0;
    }

    var token = "&quot;" + key + "&quot;:[0,";
    var startIndex = encodedHtml.indexOf(token);
    if (startIndex === -1) {
      return 0;
    }

    startIndex += token.length;
    var endIndex = encodedHtml.indexOf("]", startIndex);
    if (endIndex === -1) {
      return 0;
    }

    return toNumber(encodedHtml.substring(startIndex, endIndex));
  }

  function extractFragment(html, startToken, endToken) {
    var startIndex = html.indexOf(startToken);
    if (startIndex === -1) {
      return "";
    }

    startIndex += startToken.length;
    var endIndex = html.indexOf(endToken, startIndex);
    if (endIndex === -1) {
      return "";
    }

    return html.substring(startIndex, endIndex);
  }

  function extractSeriesChaptersFromHtml(html) {
    var chapters = [];
    var seen = {};
    var pattern = /&quot;id&quot;:\[0,(-?\d+)\],&quot;number&quot;:\[0,(-?\d+(?:\.\d+)?)\],&quot;slug&quot;:\[0,&quot;([^"]+?)&quot;\],&quot;title&quot;:\[0,&quot;([\s\S]*?)&quot;\],&quot;createdAt&quot;:\[0,&quot;([^"]+?)&quot;\][\s\S]{0,1500}?&quot;isAccessible&quot;:\[0,(true|false)\]/g;
    var match;

    while ((match = pattern.exec(html)) !== null) {
      var slug = decodeHtmlEntities(match[3]);
      if (!slug || seen[slug]) {
        continue;
      }

      seen[slug] = true;
      chapters.push({
        id: toNumber(match[1]),
        number: toNumber(match[2]),
        slug: slug,
        title: cleanDescription(match[4]),
        createdAt: match[5],
        isAccessible: match[6] === "true"
      });
    }

    return chapters;
  }

  function extractChapterPagesFromHtml(html) {
    var matches = html.match(/https:\/\/storage\.hivetoon\.com\/public\/upload\/series\/[^"'\\s<>]+\.(?:jpg|jpeg|png|webp|gif|avif)/ig) || [];
    return uniqueList(matches);
  }

  function extractEscapedJsonValue(html, marker) {
    var start = html.indexOf(marker);
    if (start === -1) {
      throw new Error("Unable to locate serialized data marker: " + marker);
    }

    start += marker.length;
    while (start < html.length && html[start] !== "{" && html[start] !== "[") {
      start += 1;
    }

    if (start >= html.length) {
      throw new Error("Unable to locate serialized JSON start for marker: " + marker);
    }

    var openCharacter = html[start];
    var closeCharacter = openCharacter === "{" ? "}" : "]";
    var depth = 0;
    var inString = false;
    var escaped = false;

    for (var index = start; index < html.length; index += 1) {
      var character = html[index];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (character === "\\") {
        escaped = true;
        continue;
      }

      if (character === "\"") {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (character === openCharacter) {
          depth += 1;
        } else if (character === closeCharacter) {
          depth -= 1;
          if (depth === 0) {
            var rawJson = html.slice(start, index + 1).replace(/\\"/g, "\"");
            return JSON.parse(rawJson);
          }
        }
      }
    }

    throw new Error("Unable to extract serialized JSON for marker: " + marker);
  }

  function extractSeriesPayload(html) {
    if (html.indexOf("&quot;post&quot;:[0,{") !== -1) {
      var postFragment = extractFragment(html, "&quot;post&quot;:[0,{", ",&quot;publishingTeam&quot;:");
      if (!postFragment) {
        throw new Error("Unable to locate HiveToons series payload fragment.");
      }

      var chapters = extractSeriesChaptersFromHtml(html);
      return {
        id: extractEncodedNumberValue(postFragment, "id"),
        slug: extractEncodedStringValue(postFragment, "slug"),
        postTitle: extractEncodedStringValue(postFragment, "postTitle"),
        postContent: extractEncodedStringValue(postFragment, "postContent"),
        featuredImage: extractEncodedStringValue(postFragment, "featuredImage"),
        averageRating: extractEncodedNumberValue(html, "averageRating"),
        author: extractEncodedStringValue(postFragment, "author"),
        artist: extractEncodedStringValue(postFragment, "artist"),
        seriesType: extractEncodedStringValue(postFragment, "seriesType"),
        seriesStatus: extractEncodedStringValue(postFragment, "seriesStatus"),
        genres: [],
        chapters: chapters
      };
    }

    return extractEscapedJsonValue(html, "\\\"post\\\":");
  }

  function extractChapterPayload(html) {
    if (html.indexOf("&quot;chapter&quot;:[0,{") !== -1) {
      var chapterFragment = extractFragment(html, "&quot;chapter&quot;:[0,{", ",&quot;chapterLabel&quot;:");
      var pages = extractChapterPagesFromHtml(html);
      return {
        id: extractEncodedNumberValue(chapterFragment, "id"),
        slug: extractEncodedStringValue(chapterFragment, "slug"),
        number: extractEncodedNumberValue(chapterFragment, "number"),
        isAccessible: pages.length > 0,
        images: pages.map(function(url, index) {
          return {
            order: index,
            url: url
          };
        })
      };
    }

    return extractEscapedJsonValue(html, "\\\"chapter\\\":");
  }

  function createHomeSection(config) {
    return App.createHomeSection({
      id: config.id,
      title: config.title,
      containsMoreItems: true,
      type: HOME_SECTION_TYPE
    });
  }

  function validateResponse(response) {
    if (response.status >= 200 && response.status < 300) {
      return;
    }

    if (response.status === 404) {
      throw new Error("HiveToons returned 404 for " + response.request.url);
    }

    if (response.status === 403 || response.status === 503) {
      throw new Error("Cloudflare Bypass Required");
    }

    throw new Error("HiveToons returned " + response.status + " for " + response.request.url);
  }

  var HiveToons = class {
    constructor() {
      this.requestManager = App.createRequestManager({
        requestsPerSecond: 4,
        requestTimeout: 20000,
        interceptor: {
          interceptRequest: async (request) => {
            request.headers = Object.assign({}, request.headers || {}, {
              origin: HIVE_BASE,
              referer: HIVE_BASE + "/",
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
      return HIVE_BASE + "/series/" + mangaId;
    }

    async getCloudflareBypassRequestAsync() {
      return App.createRequest({
        url: HIVE_BASE + "/",
        method: "GET",
        headers: {
          referer: HIVE_BASE + "/",
          origin: HIVE_BASE + "/",
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "user-agent": await this.requestManager.getDefaultUserAgent()
        }
      });
    }

    async getMangaDetails(mangaId) {
      var post = await this.fetchSeries(mangaId);
      return App.createSourceManga({
        id: mangaId,
        mangaInfo: App.createMangaInfo({
          titles: [post.postTitle],
          image: normalizeUrl(post.featuredImage),
          rating: toNumber(post.averageRating),
          status: normalizeStatus(post.seriesStatus),
          author: post.author || (post.createdby && post.createdby.name) || "",
          artist: post.artist || "",
          tags: buildTagSections(post),
          desc: cleanDescription(post.postContent)
        })
      });
    }

    async getChapters(mangaId) {
      var post = await this.fetchSeries(mangaId);
      var chapters = Array.isArray(post.chapters) ? post.chapters.slice() : [];
      chapters = chapters
        .filter(function(chapter) {
          return chapter && chapter.slug && chapter.isAccessible !== false;
        })
        .sort(compareChaptersDescending);

      if (!chapters.length) {
        throw new Error("No readable chapters were found for " + mangaId);
      }

      return chapters.map(function(chapter) {
        return App.createChapter({
          id: chapter.slug,
          name: buildChapterName(chapter),
          langCode: LANG,
          chapNum: toNumber(chapter.number),
          volume: 0,
          time: chapter.createdAt ? new Date(chapter.createdAt) : undefined
        });
      });
    }

    async getChapterDetails(mangaId, chapterId) {
      var chapter = await this.fetchChapter(mangaId, chapterId);
      if (chapter.isAccessible === false) {
        throw new Error("This chapter is locked on HiveToons.");
      }

      var imageList = Array.isArray(chapter.images)
        ? chapter.images
        : Array.isArray(chapter.pages)
          ? chapter.pages
          : [];

      var pages = imageList
        .slice()
        .sort(function(left, right) {
          return toNumber(left && left.order) - toNumber(right && right.order);
        })
        .map(function(image) {
          return normalizeUrl(image && (image.url || image.src));
        })
        .filter(Boolean);

      if (!pages.length) {
        throw new Error("No pages were found for " + mangaId + "/" + chapterId);
      }

      return App.createChapterDetails({
        id: chapterId,
        mangaId: mangaId,
        pages: pages
      });
    }

    async getSearchResults(query, metadata) {
      var page = metadata && metadata.page ? metadata.page : 1;
      var perPage = 35;
      var payload = await this.fetchQueryPosts({
        page: page,
        perPage: perPage,
        searchTerm: query && query.title ? query.title : "",
        orderBy: "lastChapterAddedAt",
        orderDirection: "desc"
      });

      return App.createPagedResults({
        results: payload.posts.map(buildPartialSourceManga),
        metadata: page * perPage < payload.totalCount ? { page: page + 1 } : undefined
      });
    }

    async getHomePageSections(sectionCallback) {
      var sections = HOME_SECTIONS.map(createHomeSection);
      for (var sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
        sectionCallback(sections[sectionIndex]);
      }

      for (var configIndex = 0; configIndex < HOME_SECTIONS.length; configIndex += 1) {
        var config = HOME_SECTIONS[configIndex];
        var payload = await this.fetchQueryPosts({
          page: 1,
          perPage: 20,
          orderBy: config.orderBy,
          orderDirection: config.orderDirection
        });

        sections[configIndex].items = payload.posts.map(buildPartialSourceManga);
        sectionCallback(sections[configIndex]);
      }
    }

    async getViewMoreItems(homepageSectionId, metadata) {
      var config = HOME_SECTIONS.find(function(section) {
        return section.id === homepageSectionId;
      });

      if (!config) {
        throw new Error("Unknown HiveToons home section: " + homepageSectionId);
      }

      var page = metadata && metadata.page ? metadata.page : 1;
      var perPage = 35;
      var payload = await this.fetchQueryPosts({
        page: page,
        perPage: perPage,
        orderBy: config.orderBy,
        orderDirection: config.orderDirection
      });

      return App.createPagedResults({
        results: payload.posts.map(buildPartialSourceManga),
        metadata: page * perPage < payload.totalCount ? { page: page + 1 } : undefined
      });
    }

    async fetchQueryPosts(options) {
      var query = buildQueryString({
        page: options.page || 1,
        perPage: options.perPage || 35,
        view: "archive",
        orderBy: options.orderBy || "lastChapterAddedAt",
        orderDirection: options.orderDirection || "desc",
        searchTerm: options.searchTerm && String(options.searchTerm).trim()
          ? String(options.searchTerm).trim()
          : undefined
      });

      var response = await this.scheduleRequest(HIVE_API + "/api/query?" + query);
      var payload = typeof response.data === "string" ? JSON.parse(response.data) : response.data;

      var posts = Array.isArray(payload.posts)
        ? payload.posts.filter(function(post) {
            return post && post.slug && post.postTitle && post.isNovel !== true;
          })
        : [];

      return {
        posts: posts,
        totalCount: toNumber(payload.totalCount)
      };
    }

    async fetchSeries(mangaId) {
      try {
        var apiResponse = await this.scheduleRequest(
          HIVE_API +
            "/api/post?" +
            buildQueryString({
              postSlug: mangaId,
              includeChapters: 1
            })
        );
        var apiPayload = typeof apiResponse.data === "string" ? JSON.parse(apiResponse.data) : apiResponse.data;

        if (apiPayload && apiPayload.post && apiPayload.post.slug) {
          if ((!Array.isArray(apiPayload.post.chapters) || !apiPayload.post.chapters.length) && apiPayload.post.id) {
            var chaptersPayload = await this.fetchChaptersByPostId(apiPayload.post.id);
            apiPayload.post.chapters = chaptersPayload.chapters;
          }

          return apiPayload.post;
        }
      } catch (error) {}

      var response = await this.scheduleRequest(HIVE_BASE + "/series/" + mangaId);
      return extractSeriesPayload(response.data);
    }

    async fetchChapter(mangaId, chapterId) {
      try {
        var apiResponse = await this.scheduleRequest(
          HIVE_API +
            "/api/chapter?" +
            buildQueryString({
              mangaslug: mangaId,
              chapterslug: chapterId
            })
        );
        var apiPayload = typeof apiResponse.data === "string" ? JSON.parse(apiResponse.data) : apiResponse.data;
        if (apiPayload && apiPayload.chapter && apiPayload.chapter.slug) {
          return apiPayload.chapter;
        }
      } catch (error) {}

      var response = await this.scheduleRequest(HIVE_BASE + "/series/" + mangaId + "/" + chapterId);
      return extractChapterPayload(response.data);
    }

    async fetchChaptersByPostId(postId) {
      var response = await this.scheduleRequest(
        HIVE_API +
          "/api/chapters?" +
          buildQueryString({
            postId: postId
          })
      );
      var payload = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
      return {
        chapters: payload && payload.post && Array.isArray(payload.post.chapters) ? payload.post.chapters : []
      };
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
    HiveToons: HiveToons,
    HiveToonsInfo: HiveToonsInfo
  };
})();

this.Sources = _Sources;
if (typeof exports === "object" && typeof module !== "undefined") {
  module.exports.Sources = this.Sources;
}
