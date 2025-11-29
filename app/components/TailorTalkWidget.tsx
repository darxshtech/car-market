'use client';

import { useEffect } from 'react';

export default function TailorTalkWidget() {
  useEffect(() => {
    // Load TailorTalk embed script dynamically
    const script = document.createElement('script');
    script.src = 'https://cdn.tailortalk.ai/embed.js';
    script.async = true;
    script.setAttribute('data-widget-id', process.env.NEXT_PUBLIC_TAILORTALK_WIDGET_ID || 'drivesphere-assistant');
    script.setAttribute('data-widget-label', 'DriveSphere AI Assistant');
    
    document.body.appendChild(script);

    // Cleanup function to remove script when component unmounts
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      // Also remove any TailorTalk widget elements that might have been created
      const widgetElements = document.querySelectorAll('[data-tailortalk-widget]');
      widgetElements.forEach(element => element.remove());
    };
  }, []);

  return (
    <div 
      id="tailortalk-widget-container"
      className="fixed bottom-6 right-6 z-40"
      style={{
        // Ensure widget doesn't obstruct critical UI elements
        pointerEvents: 'auto',
      }}
    >
      {/* TailorTalk widget will be injected here by the script */}
    </div>
  );
}
