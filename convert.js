const fs = require('fs');

const html = fs.readFileSync("/Users/dnt/.gemini/antigravity/brain/0c6a0dc1-f03e-4acb-9d7c-7d15cd0fb865/scratch/homepage.html", 'utf8');

// Extract body inner HTML
const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
if (!bodyMatch) {
  console.error("No body found");
  process.exit(1);
}

let bodyStr = bodyMatch[1];

// Remove script tags
bodyStr = bodyStr.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

// Convert class to className
bodyStr = bodyStr.replace(/ class="/g, ' className="');

// Close unclosed tags like img, input (simple regex)
bodyStr = bodyStr.replace(/<(img|input|br|hr)([^>]*?)(?<!\/)>/g, '<$1$2 />');

// Replace standard HTML comments with JSX comments if inside JSX (optional but good, though it's inside <div> so {/* */} is needed)
bodyStr = bodyStr.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');

// The output component
const reactCode = `import type { Route } from "./+types/home";
import { useEffect } from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "PHÙNG THỊ - Cúp Vinh Danh & Kỷ Niệm Chương Cao Cấp" },
    { name: "description", content: "Xưởng sản xuất kỷ niệm chương và cúp vinh danh cao cấp hàng đầu Việt Nam." },
  ];
}

export default function Home() {
  useEffect(() => {
    function reveal() {
        var reveals = document.querySelectorAll(".reveal");
        for (var i = 0; i < reveals.length; i++) {
            var windowHeight = window.innerHeight;
            var elementTop = reveals[i].getBoundingClientRect().top;
            var elementVisible = 150;
            if (elementTop < windowHeight - elementVisible) {
                reveals[i].classList.add("active");
            }
        }
    }
    window.addEventListener("scroll", reveal);
    reveal();

    const nav = document.getElementById('main-nav');
    function handleScroll() {
        if (window.scrollY > 50) {
            nav?.classList.add('h-16');
            nav?.classList.remove('h-20');
        } else {
            nav?.classList.add('h-20');
            nav?.classList.remove('h-16');
        }
    }
    window.addEventListener('scroll', handleScroll);

    return () => {
        window.removeEventListener("scroll", reveal);
        window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="overflow-x-hidden">
${bodyStr}
    </div>
  );
}
`;

fs.writeFileSync("apps/storefront/app/routes/home.tsx", reactCode);
console.log("Converted successfully!");
