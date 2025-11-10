import { CONTENT_EXTRACTION } from './constants.js';

export async function extractTabContent(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: extractPageContent,
      args: [CONTENT_EXTRACTION]
    });

    return results?.[0]?.result || null;
  } catch (error) {
    console.log('SessionSwitch: Could not extract content from tab', tabId, error.message);
    return null;
  }
}

function extractPageContent(config) {
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
      .slice(0, config.MAX_H2_ELEMENTS)
      .map(h2 => h2.textContent.trim())
      .filter(text => text.length > 0);

    const allHeaders = document.querySelectorAll('h1, h2, h3');
    content.headers = Array.from(allHeaders)
      .slice(0, config.MAX_HEADERS)
      .map(header => header.textContent.trim())
      .filter(text => text.length > 0 && text.length < config.MAX_HEADER_LENGTH);

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
    bodyClone.querySelectorAll('script, style, nav, header, footer').forEach(el => el.remove());
    
    const visibleText = bodyClone.textContent || bodyClone.innerText || '';
    content.visibleText = visibleText
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, config.MAX_VISIBLE_TEXT_LENGTH);

    if (!content.h1 && document.title) {
      content.h1 = document.title;
    }
  } catch (error) {
    console.error('Error extracting page content:', error);
  }

  return content;
}

