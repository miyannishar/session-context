export async function extractTabContent(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: extractPageContent
    });

    if (results && results[0] && results[0].result) {
      return results[0].result;
    }

    return null;
  } catch (error) {
    console.log('SessionSwitch: Could not extract content from tab', tabId, error.message);
    return null;
  }
}

function extractPageContent() {
  const content = {
    headers: [],
    metaDescription: '',
    keywords: [],
    visibleText: '',
    h1: '',
    h2: []
  };

  try {
    const h1 = document.querySelector('h1');
    if (h1) {
      content.h1 = h1.textContent.trim();
    }

    const h2Elements = document.querySelectorAll('h2');
    content.h2 = Array.from(h2Elements)
      .slice(0, 5)
      .map(h2 => h2.textContent.trim())
      .filter(text => text.length > 0);

    const allHeaders = document.querySelectorAll('h1, h2, h3');
    content.headers = Array.from(allHeaders)
      .slice(0, 10)
      .map(header => header.textContent.trim())
      .filter(text => text.length > 0 && text.length < 200);

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      content.metaDescription = metaDesc.getAttribute('content') || '';
    }

    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      const keywords = metaKeywords.getAttribute('content') || '';
      content.keywords = keywords.split(',').map(k => k.trim()).filter(Boolean);
    }

    const bodyClone = document.body.cloneNode(true);
    const scripts = bodyClone.querySelectorAll('script, style, nav, header, footer');
    scripts.forEach(el => el.remove());
    
    const visibleText = bodyClone.textContent || bodyClone.innerText || '';
    content.visibleText = visibleText
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500);

    if (!content.h1 && document.title) {
      content.h1 = document.title;
    }

  } catch (error) {
    console.error('Error extracting page content:', error);
  }

  return content;
}

export function formatContentForLabeling(content, title, url) {
  if (!content) {
    return `${title} (${extractDomain(url)})`;
  }

  const parts = [];

  if (title) {
    parts.push(`Title: ${title}`);
  }

  if (content.h1 && content.h1 !== title) {
    parts.push(`Main Heading: ${content.h1}`);
  }

  if (content.h2 && content.h2.length > 0) {
    parts.push(`Sections: ${content.h2.slice(0, 3).join(', ')}`);
  }

  if (content.metaDescription) {
    parts.push(`Description: ${content.metaDescription.substring(0, 150)}`);
  }

  if (!content.h1 && !content.h2.length && !content.metaDescription && content.visibleText) {
    const snippet = content.visibleText.substring(0, 200).replace(/\n/g, ' ');
    parts.push(`Content: ${snippet}`);
  }

  const domain = extractDomain(url);
  if (domain) {
    parts.push(`Site: ${domain}`);
  }

  return parts.join('\n');
}

function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return null;
  }
}

export function extractKeywords(content, title) {
  const keywords = new Set();

  if (title) {
    title.toLowerCase()
      .split(/[\s\-_/]+/)
      .filter(word => word.length > 3)
      .forEach(word => keywords.add(word));
  }

  if (content && content.h1) {
    content.h1.toLowerCase()
      .split(/[\s\-_/]+/)
      .filter(word => word.length > 3)
      .forEach(word => keywords.add(word));
  }

  if (content && content.h2) {
    content.h2.forEach(h2 => {
      h2.toLowerCase()
        .split(/[\s\-_/]+/)
        .filter(word => word.length > 3)
        .forEach(word => keywords.add(word));
    });
  }

  if (content && content.visibleText) {
    content.visibleText.toLowerCase()
      .substring(0, 200)
      .split(/[\s\-_/]+/)
      .filter(word => word.length > 4)
      .forEach(word => keywords.add(word));
  }

  return keywords;
}
