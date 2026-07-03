export function ManufacturerSection() {
  return (
    <section className="py-32 px-margin-desktop bg-surface-container-low">
      <div className="max-w-container-max mx-auto">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <div className="reveal active">
            <div className="relative">
              <img className="rounded-xl w-full h-[500px] object-cover luxury-shadow" data-alt="A close-up high-resolution photo of a master craftsman etching a crystal trophy" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCOPnmbn8rJ57g44TBeZ8QErz9gGRkf1aw9MwTgrEJLz5TIXqh2vYu3Mb0qqiBRz6wXfrrXKNz6HcuhdYzl-vKasRjFsEp6uPXTboH6ivPhVLSfv7y-OVjh1XEIwXEW1JRuIGJBHU78_B6tKJNvrZbhTlLLPs49ov-dDnZxmXX0WlqGdf9yY2Md9ALjUCGsq5yZxau4vCg0DK9CK1EYG-AS-wT1ooaEXbzkqZdBqJ8ynUzO0bydJ4c8bdccmrB_80JMJ4iv3iea_FI" />
              <div className="absolute -bottom-10 -right-10 bg-primary-container p-12 rounded-xl hidden md:block">
                <span className="block font-headline-md text-headline-md text-on-primary-fixed mb-2">25+</span>
                <span className="block font-label-md text-label-md uppercase tracking-wider text-on-primary-fixed">Năm Kinh Nghiệm</span>
              </div>
            </div>
          </div>
          <div className="reveal active">
            <h2 className="font-headline-lg text-headline-lg mb-6 uppercase">NSX Cúp Vinh Danh <span className="text-primary">Chuyên Nghiệp</span></h2>
            <div className="w-20 h-1 bg-primary-container mb-8"></div>
            <p className="font-body-lg text-body-lg text-on-surface-variant mb-8 leading-relaxed">
              Phùng Thị tự hào là đơn vị tiên phong trong lĩnh vực sản xuất kỷ niệm chương và cúp vinh danh tại Việt Nam. Với quy trình sản xuất khép kín và công nghệ laser tiên tiến, mỗi sản phẩm ra đời là một lời khẳng định về đẳng cấp và sự trân trọng.
            </p>
            <div className="space-y-6 mb-12">
              <div className="flex items-start gap-4">
                <div className="bg-primary-fixed p-3 rounded-lg">
                  <span className="material-symbols-outlined text-primary">verified</span>
                </div>
                <div>
                  <h4 className="font-label-md text-label-md text-on-surface uppercase mb-1">Thiết Kế Độc Quyền</h4>
                  <p className="font-body-md text-body-md text-on-surface-variant">Hỗ trợ thiết kế mẫu mã riêng biệt theo bộ nhận diện thương hiệu của doanh nghiệp.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-primary-fixed p-3 rounded-lg">
                  <span className="material-symbols-outlined text-primary">speed</span>
                </div>
                <div>
                  <h4 className="font-label-md text-label-md text-on-surface uppercase mb-1">Giao Hàng Thần Tốc</h4>
                  <p className="font-body-md text-body-md text-on-surface-variant">Đáp ứng mọi đơn hàng số lượng lớn trong thời gian ngắn nhất với chất lượng đồng nhất.</p>
                </div>
              </div>
            </div>
            <button className="group flex items-center gap-3 font-label-md text-label-md uppercase text-primary tracking-widest border-b-2 border-transparent hover:border-primary pb-1 transition-all">
              Tìm hiểu quy trình của chúng tôi
              <span className="material-symbols-outlined transition-transform group-hover:translate-x-2">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
