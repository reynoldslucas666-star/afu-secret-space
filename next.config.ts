import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ASCII-only URLs avoid broken static serving / double-encoding for Chinese filenames in `public/`.
  async rewrites() {
    return [
      {
        source: "/media/aigc-portfolio.mp4",
        destination: "/assets/video/AIGC视频哈哈哈.mp4",
      },
      {
        source: "/media/live-action-portfolio.mp4",
        destination: "/assets/video/实拍实拍哈哈哈.mp4",
      },
      {
        source: "/media/theatrical-portfolio.mp4",
        destination: "/assets/video/院线电影hhh.mp4",
      },
    ];
  },
};

export default nextConfig;
