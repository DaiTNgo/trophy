import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

const GALLERY_IMAGES: string[] = [
  "/images/gallery/AMIS_Chat_IMG_0875.JPG",
  "/images/gallery/AMIS_Chat_IMG_3440.JPG",
  "/images/gallery/AMIS_Chat_IMG_6295.JPG",
  "/images/gallery/AMIS_Chat_IMG_6138.JPG",
  "/images/gallery/AMIS_Chat_IMG_3843.JPG",
  "/images/gallery/AMIS_Chat_IMG_0877.JPG",
  "/images/gallery/AMIS_Chat_IMG_3441.JPG",
  "/images/gallery/AMIS_Chat_IMG_6293.JPG",
  "/images/gallery/AMIS_Chat_IMG_6141.JPG",
  "/images/gallery/AMIS_Chat_IMG_5907.JPG",
  "/images/gallery/AMIS_Chat_IMG_0879.JPG",
  "/images/gallery/AMIS_Chat_IMG_3444.JPG",
  "/images/gallery/AMIS_Chat_IMG_6292.JPG",
  "/images/gallery/AMIS_Chat_IMG_6139.JPG",
  "/images/gallery/AMIS_Chat_IMG_3844.JPG",
  "/images/gallery/AMIS_Chat_IMG_6294.JPG",
  "/images/gallery/AMIS_Chat_IMG_6143.JPG",
  "/images/gallery/AMIS_Chat_IMG_6144.JPG",
  "/images/gallery/AMIS_Chat_IMG_6145.JPG",
  "/images/gallery/AMIS_Chat_IMG_6296.JPG",
  "/images/gallery/AMIS_Chat_IMG_6146.JPG",
  "/images/gallery/AMIS_Chat_IMG_6154.JPG",
  "/images/gallery/AMIS_Chat_IMG_6156.JPG",
  "/images/gallery/AMIS_Chat_IMG_6161.JPG",
  "/images/gallery/AMIS_Chat_IMG_6297.JPG",
];

export function AwardMomentsSection() {
  const { t } = useTranslation("home");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const slides = [...GALLERY_IMAGES, ...GALLERY_IMAGES];

  const handlePrev = useCallback(() => {
    setSelectedIndex((prev) =>
      prev === null ? 0 : (prev - 1 + GALLERY_IMAGES.length) % GALLERY_IMAGES.length
    );
  }, []);

  const handleNext = useCallback(() => {
    setSelectedIndex((prev) =>
      prev === null ? 0 : (prev + 1) % GALLERY_IMAGES.length
    );
  }, []);

  useEffect(() => {
    if (selectedIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, handlePrev, handleNext]);

  const currentSrc = selectedIndex !== null ? GALLERY_IMAGES[selectedIndex] : null;

  return (
    <section className="py-12 md:py-16 bg-surface-subtle overflow-hidden">
      <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
        <div className="mb-10 text-center reveal active">
          <p className="mb-3 font-label-md text-label-md uppercase tracking-[0.35em] text-brand-accent">
            {t("award_moments_eyebrow")}
          </p>
          <h2 className="font-heading text-[30px] md:text-[40px] uppercase leading-none text-on-surface">
            {t("award_moments_title")}
          </h2>
          <p className="mt-3 font-body-md text-body-md text-on-surface-variant max-w-2xl mx-auto">
            {t("award_moments_subtitle")}
          </p>
        </div>
      </div>

      <div className="award-moments-wrapper group">
        <div className="award-moments-scroll flex items-center gap-5">
          {slides.map((src, i) => {
            const originalIndex = i % GALLERY_IMAGES.length;
            return (
              <div
                key={`${src}-${i}`}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedIndex(originalIndex)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedIndex(originalIndex);
                  }
                }}
                className="group/card relative w-[280px] sm:w-[340px] md:w-[390px] shrink-0 cursor-pointer overflow-hidden rounded-2xl bg-surface-base border border-black/[0.08] shadow-sm hover:shadow-xl transition-all duration-300"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                  <img
                    src={src}
                    alt=""
                    loading={i < 6 ? "eager" : "lazy"}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lightbox Dialog */}
      <Dialog
        open={selectedIndex !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedIndex(null);
        }}
      >
        <DialogContent
          showOverlay={true}
          className="max-w-4xl p-2 sm:p-4 bg-surface-base border-none shadow-2xl overflow-hidden rounded-2xl"
        >
          <DialogTitle className="sr-only">
            Hình ảnh thực tế
          </DialogTitle>
          {currentSrc && (
            <div className="relative flex flex-col items-center">
              <div className="relative w-full aspect-[16/10] max-h-[80vh] overflow-hidden rounded-xl bg-black/5 flex items-center justify-center">
                <img
                  src={currentSrc}
                  alt=""
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Navigation buttons */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors shadow-lg focus:outline-none"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors shadow-lg focus:outline-none"
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <style>{`
        .award-moments-wrapper {
          mask-image: linear-gradient(to right, transparent, black 4%, black 96%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 4%, black 96%, transparent);
        }
        .award-moments-wrapper:hover .award-moments-scroll {
          animation-play-state: paused;
        }
        @keyframes award-moments-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .award-moments-scroll {
          width: fit-content;
          animation: award-moments-scroll 75s linear infinite;
          will-change: transform;
        }
      `}</style>
    </section>
  );
}
