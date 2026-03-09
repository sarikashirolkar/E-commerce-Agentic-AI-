"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  title: string;
  brand: string;
  category: string;
  inr_price: number;
  mrp_inr: number | null;
  discount_percent: number;
  rating: number;
  rating_count: number;
  delivery_text: string;
  stock_status: string;
  image_url: string;
  gallery_urls: string[];
  is_prime: boolean;
  bullet_points: string[];
  about_item: string[];
  size_options: string[];
  color_options: string[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

function formatINR(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const productId = params.id;

  const [product, setProduct] = useState<Product | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedImage, setSelectedImage] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [detailRes, listRes] = await Promise.all([fetch(`${API_BASE}/products/${productId}`), fetch(`${API_BASE}/products`)]);

        const detailData = (await detailRes.json()) as Product | { detail: string };
        const listData = (await listRes.json()) as Product[];

        if (!detailRes.ok || "detail" in detailData) {
          throw new Error("detail" in detailData ? detailData.detail : "Failed to load product");
        }

        setProduct(detailData as Product);
        setSelectedImage((detailData as Product).gallery_urls[0] || (detailData as Product).image_url);
        setSelectedSize((detailData as Product).size_options[0] || "Default");
        setSelectedColor((detailData as Product).color_options[0] || "Default");
        setAllProducts(listData);
      } catch (error) {
        const text = error instanceof Error ? error.message : "Unknown error";
        setMessage(text);
      }
    }

    void load();
  }, [productId]);

  const recommendations = useMemo(() => {
    if (!product) {
      return [];
    }
    return allProducts.filter((item) => item.id !== product.id).slice(0, 6);
  }, [allProducts, product]);

  if (!product) {
    return (
      <main className="aurora-page">
        <div className="glass-card detail-wrap">
          <Link href="/">Back to shopping</Link>
          <p>{message || "Loading product..."}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="aurora-page">
      <section className="glass-card detail-wrap">
        <Link href="/" className="back-link">
          ← Back to marketplace
        </Link>
        <div className="detail-grid">
          <div>
            <div className="detail-main-image">
              <Image src={selectedImage} alt={product.title} width={360} height={360} className="product-image" />
            </div>
            <div className="thumb-row">
              {(product.gallery_urls.length ? product.gallery_urls : [product.image_url]).map((url) => (
                <button key={url} onClick={() => setSelectedImage(url)} className={selectedImage === url ? "thumb active" : "thumb"}>
                  <Image src={url} alt={product.title} width={60} height={60} />
                </button>
              ))}
            </div>
          </div>

          <div className="detail-content">
            <p className="brand">{product.brand}</p>
            <h1>{product.title}</h1>
            <p className="rating">
              {product.rating.toFixed(1)} ★ ({product.rating_count.toLocaleString("en-IN")})
            </p>
            <p className="price-row">
              <strong>{formatINR(product.inr_price)}</strong>
              {product.mrp_inr ? <span className="mrp">{formatINR(product.mrp_inr)}</span> : null}
              <span className="discount">-{product.discount_percent}%</span>
            </p>
            <p className="delivery">{product.stock_status} • {product.delivery_text}</p>

            <div className="variant-group">
              <label>
                Size
                <select value={selectedSize} onChange={(event) => setSelectedSize(event.target.value)}>
                  {(product.size_options.length ? product.size_options : ["Default"]).map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Color
                <select value={selectedColor} onChange={(event) => setSelectedColor(event.target.value)}>
                  {(product.color_options.length ? product.color_options : ["Default"]).map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <h3>Key Features</h3>
            <ul className="detail-list">
              {product.bullet_points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>

            <h3>About this item</h3>
            <ul className="detail-list">
              {product.about_item.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="glass-card also-bought-wrap">
        <h2>Customers also bought</h2>
        <div className="also-carousel">
          {recommendations.map((item) => (
            <Link href={`/product/${item.id}`} key={item.id} className="also-card">
              <Image src={item.image_url} alt={item.title} width={110} height={110} className="product-image" />
              <p>{item.title}</p>
              <strong>{formatINR(item.inr_price)}</strong>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
