import React, { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  noIndex?: boolean;
  structuredData?: object;
}

export const SEO: React.FC<SEOProps> = ({
  title = "Progonomix - AI-Powered Medical Companion Platform",
  description = "Advanced AI-powered healthcare management platform that streamlines clinical workflows, enables voice-to-text SOAP notes, provides diagnostic assistance, and analyzes medical scans. Reduce documentation time by 70%.",
  keywords = "healthcare software, medical AI, SOAP notes, clinical documentation, medical imaging, diagnostic assistance, voice transcription, patient management",
  image = "/android-chrome-512x512.png",
  url = "https://progonomix.com",
  type = "website",
  noIndex = false,
  structuredData
}) => {
  const fullTitle = title.includes('Progonomix') ? title : `${title} | Progonomix`;
  const fullImageUrl = image.startsWith('http') ? image : `${url}${image}`;

  useEffect(() => {
    // Update document title
    document.title = fullTitle;
    
    // Update meta tags
    const updateMetaTag = (selector: string, content: string) => {
      let element = document.querySelector(selector) as HTMLMetaElement;
      if (element) {
        element.content = content;
      } else {
        element = document.createElement('meta');
        const [property, value] = selector.includes('property=') 
          ? ['property', selector.match(/property="([^"]*)"/)![1]]
          : ['name', selector.match(/name="([^"]*)"/)![1]];
        element.setAttribute(property, value);
        element.content = content;
        document.head.appendChild(element);
      }
    };

    // Update basic meta tags
    updateMetaTag('meta[name="description"]', description);
    updateMetaTag('meta[name="keywords"]', keywords);
    
    // Update Open Graph tags
    updateMetaTag('meta[property="og:title"]', fullTitle);
    updateMetaTag('meta[property="og:description"]', description);
    updateMetaTag('meta[property="og:image"]', fullImageUrl);
    updateMetaTag('meta[property="og:url"]', url);
    updateMetaTag('meta[property="og:type"]', type);
    
    // Update Twitter Card tags
    updateMetaTag('meta[name="twitter:title"]', fullTitle);
    updateMetaTag('meta[name="twitter:description"]', description);
    updateMetaTag('meta[name="twitter:image"]', fullImageUrl);
    
    // Update canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (canonical) {
      canonical.href = url;
    }
    
    // Handle robots meta tag
    if (noIndex) {
      updateMetaTag('meta[name="robots"]', 'noindex, nofollow');
    }
    
    // Add structured data
    if (structuredData) {
      let script = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement;
      if (script) {
        script.textContent = JSON.stringify(structuredData);
      } else {
        const newScript = document.createElement('script') as HTMLScriptElement;
        newScript.type = 'application/ld+json';
        newScript.textContent = JSON.stringify(structuredData);
        document.head.appendChild(newScript);
      }
    }
  }, [fullTitle, description, keywords, fullImageUrl, url, type, noIndex, structuredData]);

  return null; // This component doesn't render anything
};

export default SEO;