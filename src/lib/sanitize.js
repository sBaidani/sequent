import DOMPurify from 'dompurify';

export const sanitizeHtml = (dirtyHtml) => {
  return DOMPurify.sanitize(dirtyHtml, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });
};

export const sanitizeText = (dirtyText) => {
  // Strip all HTML for strict text-only fields (e.g., titles)
  return DOMPurify.sanitize(dirtyText, {
    ALLOWED_TAGS: []
  });
};
