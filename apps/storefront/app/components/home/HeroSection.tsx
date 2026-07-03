export function HeroSection() {
  return (
    <header className="relative w-full h-[85vh] flex items-center overflow-hidden bg-surface-container-low">
      <div className="absolute inset-0 z-0 opacity-80">
        <img className="w-full h-full object-cover" data-alt="A grand cinematic view of a luxury showroom floor with crystal and gold trophies arranged on white minimalist podiums. The lighting is high-key with soft reflections mimicking a crystal-clear environment." src="https://lh3.googleusercontent.com/aida-public/AB6AXuB90_lWYrj8CHeTfe5v4IeTsK_jccQ7hfjKlUGyDzAE_2VQyHihcE0RYeeSzTHrJ7NaTWjH5OrEOsqCdW81uy7isGpX0K9vkN3r2KvwIbAouk5-6HuStftZiDZI0G6HaqG8xo5u911qOcj3AcceeX7ZA-VJUiZym64lQql7RwZ-cOqyN4T7ZVzTnUeFVqc_8DUI58IrGI7JxBWtyoidZXuDgp1_mPySh3xlToWIheWaPGeZyxz-EltiKtZPjoTqJemO2xHf8Hlzam4" />
      </div>
      {/* Overlay Graphic */}
      <div className="absolute inset-0 z-10 bg-gradient-to-r from-surface/90 via-surface/40 to-transparent"></div>
      <div className="relative z-20 px-margin-desktop max-w-container-max mx-auto w-full">
        <div className="max-w-2xl reveal active">
          <div className="inline-block bg-primary-container text-on-primary-container px-4 py-1 rounded-full text-label-md font-bold mb-6">BEST SELLER 2024</div>
          <p className="font-label-md text-label-md uppercase tracking-[0.3em] text-primary mb-2">Sản phẩm tiêu biểu</p>
          <h1 className="font-display-lg text-display-lg leading-tight mb-4">
            <span className="block text-on-surface">CÚP HỢP KIM</span>
            <span className="block text-primary">KL1 PREMIUM</span>
          </h1>
          <div className="flex items-baseline gap-4 mb-8">
            <span className="text-3xl font-bold text-on-surface">1.250.000đ</span>
            <span className="text-on-surface-variant line-through">1.800.000đ</span>
          </div>
          <p className="font-body-lg text-body-lg text-on-surface-variant mb-12 max-w-lg">
            Thiết kế tối giản với chất liệu hợp kim mạ vàng 24K, đế đá đen Granite sang trọng. Biểu tượng hoàn hảo cho thành tựu xuất sắc.
          </p>
          <div className="flex items-center gap-6">
            <button className="bg-primary text-white font-label-md text-label-md uppercase px-12 py-4 rounded-full tracking-widest hover:bg-primary-container transition-all duration-300 shadow-lg flex items-center gap-2">
              <span className="material-symbols-outlined">shopping_bag</span>
              Mua Ngay
            </button>
            <button className="border-2 border-primary text-primary font-label-md text-label-md uppercase px-10 py-4 rounded-full tracking-widest hover:bg-primary-fixed transition-all duration-300">
              Chi Tiết
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
