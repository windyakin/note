import type ja from "./ja";

const en: Record<keyof typeof ja, string> = {
  "html.lang": "en",
  "date.locale": "en-US",
  "readMore": "Read more",
  "readArticle": "Read article \"{{title}}\"",
  "readArticleFallback": "Read article",
  "noArticles": "No articles yet.",
  "pageNavigation": "Page navigation",
  "backlinkTitle": "Articles linking to this article",
  "tagList": "Tags",
  "tagCount": "{{count}} tags",
  "noTags": "No tags yet.",
  "tagArticles": "Articles tagged \"{{tag}}\"",
  "itemCount": "{{count}} items",
  "publishedDate": "Published",
  "tags": "Tags",
  "siteNavigation": "Site navigation",
};

export default en;
