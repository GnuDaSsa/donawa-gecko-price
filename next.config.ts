import type { NextConfig } from "next";

const listingImageHosts = [
  "api.feedle.me",
  "img.kiwow.kr",
  "contents.sixshop.com",
  "images.mybreeders.com",
  "newrunreptile.co.kr",
  "cafeptthumb-phinf.pstatic.net",
  "xn--9m1b023b.com",
  "myage.co.kr",
  "thebreeders.cafe24.com",
  "xn--699at5i1sh8pu9yi.com",
  "thejurassic.co.kr",
  "thesafari.kr",
  "www.thebestfarm.kr",
  "ecimg.cafe24img.com",
  "thereptile.co.kr",
  "gjwnddnjs123.cafe24.com",
  "themonster.co.kr",
  "thedragon1.cafe24.com",
  "newrunwild.co.kr",
  "frienzoo.com",
  "tarancenter.com",
  "cdn.imweb.me",
] as const;

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Permissions-Policy",
            value: "geolocation=(self), camera=(), microphone=()",
          },
        ],
      },
    ];
  },
  images: {
    // Cloudflare Workers Free에서 별도 Cloudflare Images 요금제 없이 원본 이미지를 직접 전달한다.
    unoptimized: true,
    remotePatterns: [
      ...listingImageHosts.map((hostname) => ({
        protocol: "https" as const,
        hostname,
        port: "",
        pathname: "/**",
        search: "",
      })),
      {
        protocol: "https",
        hostname: "www.zooseyo.com",
        port: "8443",
        pathname: "/z_cate_list_image/**",
        search: "",
      },
    ],
  },
};

export default nextConfig;
