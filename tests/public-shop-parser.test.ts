import { describe, expect, it } from "vitest";

import {
  parseCafe24CategoryHtml,
  parseCafe24ProductHtml,
  parseImwebCategoryHtml,
  parseImwebProductHtml,
  parseKiwoCategoryHtml,
  parseKiwoProductHtml,
  parseNewrunCategoryHtml,
  parseNewrunProductHtml,
  parseMyBreedersHomeProductUrls,
  parseMyBreedersProductHtml,
  parseMyBreedersSitemap,
  parseWatertailProductHtml,
  parseZooseyoCategoryHtml,
  parseZooseyoProductHtml,
} from "@/supabase/functions/collect-public-shops/parser";

describe("Domestic Imweb public-shop parser", () => {
  it("discovers only same-host public product links and canonicalizes them", () => {
    const html = `
      <a href="/shop_view/?idx=139">릴리화이트</a>
      <a href="/shop_view/100">카푸치노</a>
      <a href="https://evil.example/shop_view/?idx=999">외부</a>
      <a href="/shop_cart">장바구니</a>
      <a href="/shop_view/?idx=139">중복</a>`;

    expect(parseImwebCategoryHtml(html, "https://hellogcekogood.com/24")).toEqual([
      "https://hellogcekogood.com/shop_view/?idx=139",
      "https://hellogcekogood.com/shop_view/?idx=100",
    ]);
  });

  it("extracts safe product JSON-LD fields and uses the visible sold badge", () => {
    const product = {
      "@type": "Product",
      name: "M.01 릴리화이트 수컷",
      image: ["https://cdn.imweb.me/thumbnail/lilly.jpg"],
      offers: { price: 250000, availability: "http://schema.org/InStock" },
    };
    const html = `
      <title>M.01 릴리화이트 수컷 : 크레스티드게코 전문 브리딩 파충류샵</title>
      <script type="application/ld+json">${JSON.stringify(product)}</script>
      <div class="prod_icon sold_out">SOLDOUT</div>`;

    expect(
      parseImwebProductHtml(
        html,
        "https://hellogcekogood.com/shop_view/139",
        {
          expectedHostname: "hellogcekogood.com",
          source: "hellogecko-imweb-jsonld",
          safeDescription: "공개 상품 페이지",
        },
      ),
    ).toMatchObject({
      externalId: "139",
      originalTitle: product.name,
      originalUrl: "https://hellogcekogood.com/shop_view/?idx=139",
      currentPrice: 250000,
      status: "SOLD",
      sex: "MALE",
    });
  });

  it("rejects supplies, other species, and off-host product pages", () => {
    const html = (name: string) => `
      <title>${name} : 크레스티드게코 전문 브리딩 파충류샵</title>
      <script type="application/ld+json">${JSON.stringify({
        "@type": "Product",
        name,
        offers: { price: 50000, availability: "InStock" },
      })}</script>`;
    const options = {
      expectedHostname: "hellogcekogood.com",
      source: "hellogecko-imweb-jsonld",
      safeDescription: "공개 상품 페이지",
    };

    expect(parseImwebProductHtml(
      html("크레스티드게코 사육장"),
      "https://hellogcekogood.com/shop_view/?idx=1",
      options,
    )).toBeNull();
    expect(parseImwebProductHtml(
      html("가고일 게코 암컷"),
      "https://hellogcekogood.com/shop_view/?idx=2",
      options,
    )).toBeNull();
    expect(parseImwebProductHtml(
      html("릴리화이트"),
      "https://evil.example/shop_view/?idx=3",
      options,
    )).toBeNull();
  });
});

describe("Domestic Cafe24 public-shop parser", () => {
  it("discovers only same-host crested-gecko animal products", () => {
    const html = `
      <a href="/product/크레스티드게코-릴리화이트/101/category/132/display/1/">릴리화이트</a>
      <a href="/product/크레스티드게코-사육장-세트/102/category/132/display/1/">사육장</a>
      <a href="/product/레오파드게코-노멀/103/category/132/display/1/">레오파드게코</a>
      <a href="/product/크레스티드게코-레오파드게코-랜덤이벤트/104/category/132/display/1/">혼합 종 이벤트</a>
      <a href="https://evil.example/product/크레스티드게코/999/">외부 링크</a>
      <a href="/product/크레스티드게코-릴리화이트/101/">중복</a>`;

    expect(parseCafe24CategoryHtml(html, "https://thejurassic.co.kr")).toEqual([
      "https://thejurassic.co.kr/product/%ED%81%AC%EB%A0%88%EC%8A%A4%ED%8B%B0%EB%93%9C%EA%B2%8C%EC%BD%94-%EB%A6%B4%EB%A6%AC%ED%99%94%EC%9D%B4%ED%8A%B8/101/",
    ]);
  });

  it("removes embedded product-name markup before storing and classifying", () => {
    const product = {
      "@type": "Product",
      name: '<font color="FF007F">릴리화이트</font><br>크레스티드게코 수컷',
      offers: { price: 220000, availability: "InStock" },
    };
    const html = `
      <script type="application/ld+json">${JSON.stringify(product)}</script>
      <meta property="product:productId" content="220" />`;

    expect(
      parseCafe24ProductHtml(
        html,
        "https://xn--9m1b023b.com/product/lilly/220/",
        {
          expectedHostname: "xn--9m1b023b.com",
          source: "thezoo-cafe24-jsonld",
          safeDescription: "공개 상품 페이지",
        },
      ),
    ).toMatchObject({
      originalTitle: "릴리화이트 크레스티드게코 수컷",
      morphText: "릴리화이트 크레스티드게코 수컷",
      sex: "MALE",
    });
  });

  it("extracts safe JSON-LD fields and trusts the public sold-out flag", () => {
    const product = {
      "@type": "Product",
      name: "크레스티드게코 카푸치노 수컷",
      image: ["https://thejurassic.co.kr/web/product/big/cappuccino.jpg"],
      offers: [{ price: 180000, availability: "InStock" }],
    };
    const html = `
      <script type="application/ld+json">${JSON.stringify(product)}</script>
      <meta property="product:productId" content="1601" />
      <script>var is_soldout_icon = 'T';</script>`;

    expect(
      parseCafe24ProductHtml(
        html,
        "https://thejurassic.co.kr/product/crested-cappuccino/1601/category/132/display/1/",
        {
          expectedHostname: "thejurassic.co.kr",
          source: "thejurassic-cafe24-jsonld",
          safeDescription: "공개 상품 페이지",
          categoryNo: 132,
        },
      ),
    ).toMatchObject({
      externalId: "1601",
      originalTitle: product.name,
      originalUrl: "https://thejurassic.co.kr/product/crested-cappuccino/1601/",
      currentPrice: 180000,
      status: "SOLD",
      sex: "MALE",
      rawData: {
        source: "thejurassic-cafe24-jsonld",
        product_sold_out: true,
        category_no: 132,
      },
    });
  });

  it("rejects off-host fallbacks, supplies, and mixed-species event products", () => {
    const html = (name: string) => `
      <script type="application/ld+json">${JSON.stringify({
        "@type": "Product",
        name,
        offers: { price: 50000 },
      })}</script>
      <meta property="product:productId" content="10" />`;
    const options = {
      expectedHostname: "thesafari.kr",
      source: "thesafari-cafe24-jsonld",
      safeDescription: "공개 상품 페이지",
    };

    expect(
      parseCafe24ProductHtml(
        html("크레스티드게코 릴리화이트"),
        "https://evil.example/product/crested/10/",
        options,
      ),
    ).toBeNull();
    expect(
      parseCafe24ProductHtml(
        html("크레스티드게코 사육장 세트"),
        "https://thesafari.kr/product/crested-cage/10/",
        options,
      ),
    ).toBeNull();
    expect(
      parseCafe24ProductHtml(
        html("크레스티드게코/레오파드게코 랜덤 분양 이벤트"),
        "https://thesafari.kr/product/mixed-event/10/",
        options,
      ),
    ).toBeNull();
  });
});

describe("ZOO세요 public-listing parser", () => {
  const activeUrl =
    "https://www.zooseyo.com/sale/sale_view.php?type=Mem_dog_b&oid_no=zoo123&no=1352151";

  it("discovers exact crested-gecko cards and keeps category status only", () => {
    const html = `
      <!-- seller phone 010-1234-5678 must never be extracted -->
      <a class="d-cate-list-card" href="/sale/sale_view.php?type=Mem_dog_b&amp;oid_no=zoo123&amp;no=1352151">
        <div><img class="d-cate-list-img" src="https://www.zooseyo.com:8443/z_cate_list_image/active.webp"></div>
        <span class="d-cate-list-breed">크레스티드 게코</span>
      </a>
      <a href="/sale/sale_view.php?no=1351718" class="d-cate-list-card">
        <div class="d-sold-overlay">입양 완료</div>
        <span class="d-cate-list-breed">크레스티드 게코</span>
      </a>
      <a class="d-cate-list-card" href="/sale/sale_view.php?no=999">
        <span class="d-cate-list-breed">레오파드 게코</span>
      </a>`;

    expect(parseZooseyoCategoryHtml(html)).toEqual([
      {
        url: activeUrl,
        status: "ACTIVE",
        imageUrl: "https://www.zooseyo.com:8443/z_cate_list_image/active.webp",
      },
      {
        url: "https://www.zooseyo.com/sale/sale_view.php?no=1351718",
        status: "SOLD",
        imageUrl: undefined,
      },
    ]);
  });

  it("extracts only title, species, price, sex and the allowlisted thumbnail", () => {
    const html = `
      <h2>카푸치노 수컷 010-1234-5678 gecko@example.com</h2>
      <div class="pet-info-title">도마뱀(게코) 일반분양</div>
      <div class="pet-info-item"><span class="pet-info-label">지역</span><span class="pet-info-value">서울 상세주소 저장금지</span></div>
      <div class="pet-info-item"><span class="pet-info-label">품종</span><span class="pet-info-value">크레스티드 게코</span></div>
      <div class="pet-info-item"><span class="pet-info-label">성별</span><span class="pet-info-value gender">남아</span></div>
      <div class="footer-price-value">120,000원</div>
      <div class="seller-body">전화 010-9999-9999</div>`;
    const result = parseZooseyoProductHtml(html, activeUrl, {
      url: activeUrl,
      status: "ACTIVE",
      imageUrl: "https://www.zooseyo.com:8443/z_cate_list_image/active.webp",
    });

    expect(result).toMatchObject({
      externalId: "1352151",
      originalTitle: "카푸치노 수컷 [연락처 생략] [이메일 생략]",
      currentPrice: 120000,
      priceType: "FIXED",
      status: "ACTIVE",
      sex: "MALE",
      imageUrl: "https://www.zooseyo.com:8443/z_cate_list_image/active.webp",
      rawData: {
        source: "zooseyo-public-html",
        species: "크레스티드 게코",
        listing_status: "ACTIVE",
      },
    });
    expect(JSON.stringify(result)).not.toContain("상세주소");
    expect(JSON.stringify(result)).not.toContain("010-9999-9999");
  });
});

describe("Kiwo public-shop parser", () => {
  it("discovers only crested-gecko animal cards", () => {
    const html = `
      <div class="product-card"><a href="/product/10">
        <div class="name">릴리화이트 암컷</div>
        <div class="category"><span>게코</span><span>&gt; 크레스티드 게코</span></div>
      </a></div>
      <div class="product-card"><a href="/product/11">
        <div class="name">카메룬 드워프 게코</div>
        <div class="category">게코 &gt; 기타 게코</div>
      </a></div>`;

    expect(parseKiwoCategoryHtml(html)).toEqual(["https://kiwo.kr/product/10"]);
  });

  it("extracts an active current price from product JSON-LD", () => {
    const product = {
      "@type": "Product",
      name: "릴리화이트 암컷",
      image: "https://img.kiwow.kr/product/10/example.jpg",
      category: "게코 > 크레스티드 게코",
      url: "https://kiwo.kr/product/10",
      offers: {
        "@type": "Offer",
        price: 200000,
        availability: "https://schema.org/InStock",
      },
    };
    const html = `<script type="application/ld+json">${JSON.stringify(product)}</script>`;

    expect(parseKiwoProductHtml(html, product.url)).toMatchObject({
      externalId: "10",
      originalTitle: "릴리화이트 암컷",
      currentPrice: 200000,
      status: "ACTIVE",
      priceType: "FIXED",
      sex: "FEMALE",
    });
  });

  it("rejects supplies even when their title mentions crested geckos", () => {
    const product = {
      "@type": "Product",
      name: "크레스티드 게코 사육 세트",
      category: "용품 > 세트 용품",
      url: "https://kiwo.kr/product/20",
      offers: { price: 39500, availability: "https://schema.org/InStock" },
    };
    const html = `<script type="application/ld+json">${JSON.stringify(product)}</script>`;

    expect(parseKiwoProductHtml(html, product.url)).toBeNull();
  });
});

describe("Newrun Reptile public-shop parser", () => {
  it("discovers canonical public product URLs from Cafe24 category cards", () => {
    const html = `
      <a href="/product/detail.html?product_no=5010&amp;cate_no=197&amp;display_group=1">릴리화이트</a>
      <a href="/product/detail.html?cate_no=197&amp;product_no=5012">랜덤모프</a>
      <a href="/product/detail.html?product_no=5010&amp;cate_no=197">중복</a>
      <a href="/admin/product/detail.html?product_no=9999">관리자</a>`;

    expect(parseNewrunCategoryHtml(html)).toEqual([
      "https://newrunreptile.co.kr/product/detail.html?product_no=5010&cate_no=197&display_group=1",
      "https://newrunreptile.co.kr/product/detail.html?product_no=5012&cate_no=197&display_group=1",
    ]);
  });

  it("extracts an active fixed-price animal and safe fields only", () => {
    const product = {
      "@type": "Product",
      name: "릴리화이트 수컷 성체급",
      image: ["https://newrunreptile.co.kr/web/product/big/lilly.jpg"],
      offers: {
        price: 39900,
        url: "https://newrunreptile.co.kr/product/lilly/5010/",
      },
    };
    const html = `
      <script type="application/ld+json">${JSON.stringify(product)}</script>
      <meta property="product:productId" content="5010" />
      <script>var is_soldout_icon = 'F';</script>`;

    expect(
      parseNewrunProductHtml(
        html,
        "https://newrunreptile.co.kr/product/detail.html?product_no=5010",
      ),
    ).toMatchObject({
      externalId: "5010",
      originalTitle: product.name,
      currentPrice: 39900,
      status: "ACTIVE",
      priceType: "FIXED",
      originalUrl: product.offers.url,
      imageUrl: product.image[0],
      morphText: product.name,
    });
  });

  it("marks sold-out animals and rejects supplies", () => {
    const animal = {
      "@type": "Product",
      name: "프라푸치노 크레스티드게코",
      offers: { price: 250000 },
    };
    const supply = { ...animal, name: "크레스티드게코 사육장 세트" };
    const html = (product: object) => `
      <script type="application/ld+json">${JSON.stringify(product)}</script>
      <meta property="product:productId" content="4984" />
      <script>var is_soldout_icon = 'T';</script>`;

    expect(
      parseNewrunProductHtml(
        html(animal),
        "https://newrunreptile.co.kr/product/detail.html?product_no=4984",
      )?.status,
    ).toBe("SOLD");
    expect(
      parseNewrunProductHtml(
        html(supply),
        "https://newrunreptile.co.kr/product/detail.html?product_no=4984",
      ),
    ).toBeNull();
  });
});

describe("MyBreeders public-product parser", () => {
  function rscHtml(product: Record<string, unknown>) {
    const escaped = JSON.stringify(product)
      .replaceAll("\\", "\\\\")
      .replaceAll('"', '\\"');
    return `<script>self.__next_f.push([1,"props,\\"initialProduct\\":${escaped},\\"initialBids\\":[]"])</script>`;
  }

  it("orders public product sitemap URLs by latest modification", () => {
    const xml = `
      <urlset>
        <url><loc>https://mybreeders.com/product/older</loc><lastmod>2026-04-01T00:00:00Z</lastmod></url>
        <url><loc>https://mybreeders.com/product/newer</loc><lastmod>2026-06-01T00:00:00Z</lastmod></url>
        <url><loc>https://mybreeders.com/api/private</loc><lastmod>2026-07-01T00:00:00Z</lastmod></url>
      </urlset>`;

    expect(parseMyBreedersSitemap(xml)).toEqual([
      "https://mybreeders.com/product/newer",
      "https://mybreeders.com/product/older",
    ]);
  });

  it("discovers only public product ids from the homepage product payload", () => {
    const html = String.raw`
      <script>self.__next_f.push([1,"{\"contest\":{\"productNo\":\"ignore-before-marker\"}}"])</script>
      <script>self.__next_f.push([1,"{\"initialProductPage\":{\"content\":[
        {\"productNo\":\"active-1\"},{\"productNo\":\"active_2\"},{\"productNo\":\"active-1\"}
      ]}}"])</script>`;

    expect(parseMyBreedersHomeProductUrls(html)).toEqual([
      "https://mybreeders.com/product/active-1",
      "https://mybreeders.com/product/active_2",
    ]);
  });

  it("extracts only allowlisted crested-gecko product fields", () => {
    const product = {
      productNo: "product-1",
      category: "REPTILES",
      title: "릴리화이트 암컷",
      description: "판매자 전화번호와 주소가 포함될 수 있는 원문",
      tradeType: "SALE",
      price: 180000,
      status: "ACTIVE",
      saleChannel: "INTERNAL",
      seller: { name: "개인 판매자", address: "저장 금지" },
      images: [{ imageUrl: "https://images.mybreeders.com/pet/example.webp", isThumbnail: true }],
      species: "크레스티드 게코",
      morphs: ["릴리화이트", "화이트월"],
      trait: "풀핀",
      gender: "FEMALE",
      weight: 18.5,
    };
    const result = parseMyBreedersProductHtml(
      rscHtml(product),
      "https://mybreeders.com/product/product-1",
    );

    expect(result).toMatchObject({
      externalId: "product-1",
      originalTitle: "릴리화이트 암컷",
      currentPrice: 180000,
      priceType: "FIXED",
      status: "ACTIVE",
      sex: "FEMALE",
      weightG: 18.5,
      morphText: "릴리화이트 화이트월 릴리화이트 암컷",
      imageUrl: "https://images.mybreeders.com/pet/example.webp",
    });
    expect(JSON.stringify(result?.rawData)).not.toContain("판매자");
    expect(JSON.stringify(result?.rawData)).not.toContain("주소");
    expect(result?.safeDescription).not.toContain(product.description);
  });

  it("maps completed products to sold and rejects other species", () => {
    const completed = {
      productNo: "sold-1",
      title: "아잔틱 수컷",
      tradeType: "SALE",
      price: 400000,
      status: "COMPLETED",
      species: "크레스티드 게코",
      morphs: ["아잔틱"],
    };
    const leopard = { ...completed, productNo: "leopard-1", species: "레오파드 게코" };

    expect(
      parseMyBreedersProductHtml(
        rscHtml(completed),
        "https://mybreeders.com/product/sold-1",
      )?.status,
    ).toBe("SOLD");
    expect(
      parseMyBreedersProductHtml(
        rscHtml(leopard),
        "https://mybreeders.com/product/leopard-1",
      ),
    ).toBeNull();
  });
});

describe("Watertail public-shop parser", () => {
  it("marks a product sold when the public page shows the sold-out banner", () => {
    const product = {
      "@type": "Product",
      name: "[크레스티드 게코 릴리 화이트] Y-004 레드 릴리",
      image: "https://contents.sixshop.com/gecko.jpg",
      offers: { url: "https://watertail.com/product/male", price: "550000.0" },
    };
    const html = `
      <div data-productSoldOut="notSoldOut"></div>
      <script type="application/ld+json">${JSON.stringify(product)}</script>
      <p>품절된 상품입니다.</p>`;

    expect(parseWatertailProductHtml(html, product.offers.url)).toMatchObject({
      externalId: "male",
      currentPrice: 550000,
      status: "SOLD",
      sex: "UNKNOWN",
    });
  });

  it("rejects food and supplies", () => {
    const product = {
      "@type": "Product",
      name: "[판게아] 크레스티드 게코 슈퍼푸드",
      offers: { url: "https://watertail.com/product/food", price: 14000 },
    };
    const html = `<script type="application/ld+json">${JSON.stringify(product)}</script>`;

    expect(parseWatertailProductHtml(html, product.offers.url)).toBeNull();
  });
});
