export function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return null;
  }
}

export function isDomainExcluded(url, excludedDomains) {
  const domain = extractDomain(url);
  if (!domain) return false;
  
  return excludedDomains.some(excluded => {
    return domain === excluded || domain.endsWith('.' + excluded);
  });
}

export function hasSignificantDomainChange(previousUrl, currentUrl) {
  if (!previousUrl || !currentUrl) return false;
  
  const prevDomain = extractDomain(previousUrl);
  const currDomain = extractDomain(currentUrl);
  
  if (!prevDomain || !currDomain) return false;
  
  const prevBase = getBaseDomain(prevDomain);
  const currBase = getBaseDomain(currDomain);
  
  return prevBase !== currBase;
}

function getBaseDomain(domain) {
  const parts = domain.split('.');
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }
  return domain;
}

export function isIdleThresholdExceeded(lastActivityTs, currentTs, thresholdMinutes) {
  const idleTimeMs = currentTs - lastActivityTs;
  const thresholdMs = thresholdMinutes * 60 * 1000;
  return idleTimeMs > thresholdMs;
}

export function shouldStartNewSession(lastCapture, currentCapture, idleThresholdMinutes) {
  if (!lastCapture) return true;
  
  if (isIdleThresholdExceeded(lastCapture.ts, currentCapture.ts, idleThresholdMinutes)) {
    return true;
  }
  
  if (hasSignificantDomainChange(lastCapture.url, currentCapture.url)) {
    return true;
  }
  
  return false;
}

export function deduplicateTabs(tabList) {
  if (tabList.length === 0) return [];
  
  const deduplicated = [tabList[0]];
  
  for (let i = 1; i < tabList.length; i++) {
    const prev = tabList[i - 1];
    const curr = tabList[i];
    
    if (curr.url !== prev.url) {
      deduplicated.push(curr);
    }
  }
  
  return deduplicated;
}
