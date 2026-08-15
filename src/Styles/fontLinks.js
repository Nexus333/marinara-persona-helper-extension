const FONT_LINK_IDS = {
  googlePreconnect: "ph-fonts-google-preconnect",
  gstaticPreconnect: "ph-fonts-gstatic-preconnect",
  stylesheet: "ph-fonts-stylesheet",
};

function appendLink(id, attrs) {
  if (document.getElementById(id)) return null;
  const link = document.createElement("link");
  link.id = id;
  for (const [key, value] of Object.entries(attrs)) {
    link.setAttribute(key, value);
  }
  document.head.appendChild(link);
  return link;
}

export function injectFontLinks() {
  const links = [
    appendLink(FONT_LINK_IDS.googlePreconnect, {
      rel: "preconnect",
      href: "https://fonts.googleapis.com",
    }),
    appendLink(FONT_LINK_IDS.gstaticPreconnect, {
      rel: "preconnect",
      href: "https://fonts.gstatic.com",
      crossOrigin: "",
    }),
    appendLink(FONT_LINK_IDS.stylesheet, {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Montserrat&family=Nova+Flat&family=Iceberg&display=swap",
    }),
  ];

  return () => {
    for (const link of links) {
      link?.remove();
    }
  };
}
