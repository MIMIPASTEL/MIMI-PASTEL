/** @type {import('next').NextConfig} */

// GH_PAGES=1  ->  compila a HTML/CSS/JS estático para GitHub Pages
const isPages = process.env.GH_PAGES === "1";
const basePath = "/MIMI-PASTEL";

const nextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
  ...(isPages
    ? {
        output: "export",
        basePath,
        assetPrefix: basePath,
      }
    : {}),
};

export default nextConfig;
