export function ProductGallery({ imageSrc, imageAlt }: { imageSrc: string, imageAlt: string }) {
  return (
    <div className="lg:col-span-7">
      <div className="grid grid-cols-2 gap-4">
        {/* Main Image */}
        <div className="col-span-2 aspect-[4/5] bg-surface-container-low overflow-hidden rounded-lg group">
          <img
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            data-alt={imageAlt}
            src={imageSrc}
            alt={imageAlt}
          />
        </div>
        {/* Detail Shots */}
        <div className="aspect-square bg-surface-container-low overflow-hidden rounded-lg group">
          <img
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            data-alt="A macro close-up shot of the intricate engraving detail on the base of a high-end metal trophy..."
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBqTO62grQ6SkE1aVJOIfFkJvXTnckRtmXllpKA1E8fiZtY94lDhUKqgaJAZLulGtIT-4h9n38bVlnNozvLlCfbIGBpgVi1wnji8KpVcRhZmtO7vfvMTVtfxAQoOO7tPKleRXif42zuze7m4HMCVQ9_lM0Ti9IeIezn_aSD-SM1yUtq6iJkqPsugBjpzORWr7sh4xX04HURqnTJu4rMKesww8lPJNesqW40oU3c-yKH3qpmTgAC9s8C"
          />
        </div>
        <div className="aspect-square bg-surface-container-low overflow-hidden rounded-lg group">
          <img
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            data-alt="A side-angle view of a contemporary alloy trophy emphasizing its architectural geometry..."
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuD5C-jy-RTZOiVOVA-O62ohVHunsTxzhPTWDFvDd8pPlKUZuHb6itw2vYGKKm61pHmIoW89PrB2Fv2XdeIotIdN3RKKFIEqxyKTrNMjmyz6mvAxde8TQfDSDlXZQxFoyVmyjM2cQpHKxFglajhKoLLJ2n9Kb_JR3I9_pFtxU5XoEiVEIPXKgX-VYeuP2ReuNcz5g1yY0GGwrO-Rk1t8Xub_T8E6JcVFF8LPVFSGHk6LRgeFbvt3koAb"
          />
        </div>
        <div className="col-span-2 aspect-[16/9] bg-surface-container-low overflow-hidden rounded-lg group">
          <img
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            data-alt="A lifestyle photograph of three variations of the KL1 Premium trophy..."
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDF5k2RK7du-PhjuJlq1YT2fsRvQVrCQYTXrh5YmG52a5aDfSSS7RcSLxcIg6bzMi4kBvBjmgca1uyXEEjlpTnUEoqKV_cDVzMfmmL4ZarsO-Lj_DZZVrjbzhUYlxaNF9FGBcZEZWTsQPiNijWAI9OcrZolKYREjeRM-jGneyCvcxsy_QKXiQ36LlM5w2O06zY207NOw-98kEj7xNo3G4i5tPuxGh_N5yYPk_B-a_10y4rj42PAWK31"
          />
        </div>
      </div>
    </div>
  );
}
