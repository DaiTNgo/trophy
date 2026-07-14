import { useState, useEffect, useRef, useCallback } from "react";

const FAKE_PRODUCTS = [
  { id: 1, title: "Cúp Vàng Phùng Thị", handle: "cup-vang-phung-thi", thumbnail: null, priceAmount: 350000, priceFrom: false },
  { id: 2, title: "Cúp Bạc Cao Cấp", handle: "cup-bac-cao-cap", thumbnail: null, priceAmount: 250000, priceFrom: false },
  { id: 3, title: "Huy Chương Vàng", handle: "huy-chuong-vang", thumbnail: null, priceAmount: 150000, priceFrom: false },
  { id: 4, title: "Huy Chương Bạc", handle: "huy-chuong-bac", thumbnail: null, priceAmount: 120000, priceFrom: false },
  { id: 5, title: "Bảng Danh Dự", handle: "bang-danh-du", thumbnail: null, priceAmount: 500000, priceFrom: false },
  { id: 6, title: "Kỷ Niệm Chương", handle: "ky-niem-chuong", thumbnail: null, priceAmount: 80000, priceFrom: false },
  { id: 7, title: "Cờ Lưu Niệm", handle: "co-luu-niem", thumbnail: null, priceAmount: 200000, priceFrom: false },
  { id: 8, title: "Bộ Ấm Trà Mạ Vàng", handle: "bo-am-tra-ma-vang", thumbnail: null, priceAmount: 1200000, priceFrom: true },
  { id: 9, title: "Tượng Phù Điêu", handle: "tuong-phu-dieu", thumbnail: null, priceAmount: 800000, priceFrom: false },
  { id: 10, title: "Giấy Khen Mạ Vàng", handle: "giay-khen-ma-vang", thumbnail: null, priceAmount: 300000, priceFrom: false },
  { id: 11, title: "Hộp Quà Tặng Danh Dự", handle: "hop-qua-tang-danh-du", thumbnail: null, priceAmount: 450000, priceFrom: false },
  { id: 12, title: "Đĩa Lưu Niệm Mạ Vàng", handle: "dia-luu-niem-ma-vang", thumbnail: null, priceAmount: 600000, priceFrom: false },
];

const FAKE_CATEGORIES = [
  { id: 1, name: "Cúp", handle: "cup" },
  { id: 2, name: "Huy Chương", handle: "huy-chuong" },
  { id: 3, name: "Bảng Danh Dự", handle: "bang-danh-du" },
  { id: 4, name: "Kỷ Niệm Chương", handle: "ky-niem-chuong" },
  { id: 5, name: "Quà Tặng", handle: "qua-tang" },
  { id: 6, name: "Cờ & Hiệu", handle: "co-hieu" },
  { id: 7, name: "Đĩa Lưu Niệm", handle: "dia-luu-niem" },
  { id: 8, name: "Tượng & Phù Điêu", handle: "tuong-phu-dieu" },
];

export interface MockProduct {
  id: number;
  title: string;
  handle: string;
  thumbnail: string | null;
  priceAmount: number | null;
  priceFrom: boolean;
}

export interface MockCategory {
  id: number;
  name: string;
  handle: string;
}

export interface SearchResults {
  products: MockProduct[];
  categories: MockCategory[];
}

export function useSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const clear = useCallback(() => {
    setQuery("");
    setResults(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query.toLowerCase();

    timerRef.current = setTimeout(() => {
      const matchedProducts = FAKE_PRODUCTS.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.handle.toLowerCase().includes(q),
      );

      const matchedCategories = FAKE_CATEGORIES.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.handle.toLowerCase().includes(q),
      );

      setResults({ products: matchedProducts, categories: matchedCategories });
      setLoading(false);
    }, 400);

    return () => clearTimeout(timerRef.current);
  }, [query]);

  return { query, setQuery, results, loading, clear };
}
