export function CategoriesSection() {
  return (
    <section className="py-32 px-margin-desktop bg-surface">
      <div className="max-w-container-max mx-auto">
        <div className="text-center mb-20 reveal active">
          <h2 className="font-headline-lg text-headline-lg mb-4">DANH MỤC SẢN PHẨM</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">Khám phá thế giới vinh danh qua các chất liệu tinh tuyển</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter h-[600px]">
          {/* Crystal Card */}
          <div className="group relative overflow-hidden rounded-xl luxury-shadow md:row-span-2 reveal active">
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all duration-500 z-10"></div>
            <img className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" data-alt="Multifaceted crystal trophies" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAgQAHozjknMXsuCTTnSblh7acqLFc9ojeTxxob7IBlmX0qt9tGfPPR88W1MN-oM7wGmvXNWbvcEFp8lFXeuxilObjL7GKKEUMDJu4eS6IlBSZT1iQMYN_hSTQbnRK8E0aJQ41BlDFDpLJMYjEoLhBm1EeZYaLe4U68gAIwomcdGJYzqLnANzgpMJKkepY7lK8JyRwQCSAYRCszCCG3eDReWxcRH3bvGaNamkzvYX-ShOEJX7CiZmhQBc4AohWK_uSReLwz81UEOOA" />
            <div className="absolute bottom-10 left-10 z-20 text-white">
              <h3 className="font-headline-md text-headline-md mb-2">CRYSTAL</h3>
              <p className="font-body-md text-body-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 mb-4">Sự thuần khiết và sang trọng vượt thời gian</p>
              <button className="px-6 py-2 border border-white text-white font-label-md text-label-md rounded-full hover:bg-white hover:text-black transition-all">Xem tất cả</button>
            </div>
          </div>
          {/* Alloy Card */}
          <div className="group relative overflow-hidden rounded-xl luxury-shadow reveal active">
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all duration-500 z-10"></div>
            <img className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" data-alt="Alloy and metal trophies" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCof9Ae0opSNU99rLeTsqWyS8aLCxkh1u3ZC0gk84FAm-6hSVR3vxxyAxBvlqz-6IRc3HOF7CON7FZA7SUKWrued2KBiZxJR8GQoDrO27UZPEXjGFQJ5yeU_gx6wlW1JCEpu3QyRECXvNSu4R9zf8H93yrHCF8LwtOFhxOK3jNBm6xMa1BUMF7zFHZXtm7wgqIS9WtpYHQXGwIIZYJQ5h3eQkw0qjv7vlkCmMjtuhb88TMYG8RYdiqGWEgE0dQyoyN4GuffoltSSNI" />
            <div className="absolute bottom-8 left-8 z-20 text-white">
              <h3 className="font-headline-md text-headline-md mb-2 uppercase">ALLOY</h3>
              <button className="font-label-md text-label-md uppercase tracking-widest flex items-center gap-2 group-hover:gap-4 transition-all">
                Khám phá <span className="material-symbols-outlined">north_east</span>
              </button>
            </div>
          </div>
          {/* Plaques Card */}
          <div className="group relative overflow-hidden rounded-xl luxury-shadow reveal active">
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all duration-500 z-10"></div>
            <img className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" data-alt="Premium wooden and metallic plaques" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBIhwzhb8Rp0GXr_875RT-XyDhy8KLGVdwRSITj2AteLLm5NOcBqtFc0K_rPrfacTkx0MKSv3tRwWJJrWyDUeURf_PxnZZ8wHIP0tlO9_AIWsHpKsjsXWkfp6XnnBd0sa4VMbUOReJw5ydBXZby9gc8Zg1CCUqyOwYSvAfMyPudNlHePxT8se1LfRdIYdXDkr6N6znHAzCAlTamdKnbTAw6ilSQ21CkYRFv-aCMcAL3e9pYxyho69XvNi7S5zcsnIN1ellfTjv4E1Y" />
            <div className="absolute bottom-8 left-8 z-20 text-white">
              <h3 className="font-headline-md text-headline-md mb-2 uppercase">PLAQUES</h3>
              <button className="font-label-md text-label-md uppercase tracking-widest flex items-center gap-2 group-hover:gap-4 transition-all">
                Khám phá <span className="material-symbols-outlined">north_east</span>
              </button>
            </div>
          </div>
          {/* Custom Card */}
          <div className="group relative overflow-hidden rounded-xl luxury-shadow md:col-span-2 reveal active">
            <div className="absolute inset-0 bg-primary/20 group-hover:bg-primary/40 transition-all duration-500 z-10"></div>
            <img className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" data-alt="Customized trophies montage" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA2FCfPdrQpja-rjExsQd6KNCCoZNzH36iGPwJeAxKKPWSY3cTmr3yqknJWs5OQp9TGFUFRfllZO986nIdrrrIc6FLfigAjaRSI0ZDysGNn5uw-VmvpAAfQhcZFBp283NNwYtkL8u0ESkyIamEFzYd81MRZn3QIBtIl9arsNepDYwtPr0kIEg_nFgQOV_0qN7ijkpD-TqXtHTrXqBHWr8L1AB7HFwPvY5JMbvFw1vaf6QNEV8HU4ww6hXGMH1CybcknWrJ06CDAEhU" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-white text-center w-full px-8">
              <h3 className="font-headline-md text-headline-md mb-4 uppercase tracking-[0.2em]">THIẾT KẾ RIÊNG BIỆT</h3>
              <p className="font-body-lg text-body-lg mb-6">Biến ý tưởng của bạn thành hiện thực với dịch vụ cá nhân hóa 100%</p>
              <button className="bg-white text-primary px-12 py-3 rounded-full font-label-md text-label-md uppercase tracking-widest hover:bg-primary hover:text-white transition-all">Bắt đầu ngay</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
