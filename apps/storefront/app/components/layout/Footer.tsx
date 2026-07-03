export function Footer() {
  return (
    <footer className="bg-surface-container-low text-on-surface py-20 px-margin-desktop">
      <div className="max-w-container-max mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-3 mb-8">
              <img alt="Logo" className="h-10 w-auto" src="https://lh3.googleusercontent.com/aida/AP1WRLt_BkNiJQjFJY4CxE4PottxdWuCmWJzg7rLdHpcZe0x7phdDTNoC2R3EaHUArVOggks9g7IkasQ64ncnNqtrGRddpN_xEua40141PNlcpHbKGTBf39E0ygc1JUERjRZVkQY46t5vqQF6tvQE6_DRB3sWEn32Xz6JfUiP1cOnyzm_7qPXdKKdZNdAf1GBiFSScC3RVKTzVBTw46Oc_WHLhVtDnv7nAwBQrN1URJH2s405iQCoeuN2tFU9w" />
              <span className="font-headline-md text-headline-md text-primary">PHÙNG THỊ</span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6">
              Xưởng sản xuất kỷ niệm chương và cúp vinh danh cao cấp hàng đầu Việt Nam.
            </p>
            <div className="flex gap-4">
              <a className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary hover:text-white transition-all" href="#"><span className="material-symbols-outlined">public</span></a>
              <a className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary hover:text-white transition-all" href="#"><span className="material-symbols-outlined">call</span></a>
              <a className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary hover:text-white transition-all" href="#"><span className="material-symbols-outlined">share</span></a>
            </div>
          </div>
          <div>
            <h4 className="font-label-md text-label-md uppercase tracking-widest text-on-surface mb-8">Liên Kết Nhanh</h4>
            <ul className="space-y-4 font-body-md text-body-md text-on-surface-variant">
              <li className=""><a className="hover:text-primary transition-colors" href="#">Về Phùng Thị</a></li>
              <li className=""><a className="hover:text-primary transition-colors" href="#">Tất cả sản phẩm</a></li>
              <li className=""><a className="hover:text-primary transition-colors" href="#">Dự án tiêu biểu</a></li>
              <li className=""><a className="hover:text-primary transition-colors" href="#">Tin tức &amp; Sự kiện</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-label-md text-label-md uppercase tracking-widest text-on-surface mb-8">Hỗ Trợ Khách Hàng</h4>
            <ul className="space-y-4 font-body-md text-body-md text-on-surface-variant">
              <li className=""><a className="hover:text-primary transition-colors" href="#">Chính sách bảo hành</a></li>
              <li className=""><a className="hover:text-primary transition-colors" href="#">Hướng dẫn đặt hàng</a></li>
              <li className=""><a className="hover:text-primary transition-colors" href="#">Vận chuyển &amp; Thanh toán</a></li>
              <li className=""><a className="hover:text-primary transition-colors" href="#">Báo giá sỉ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-label-md text-label-md uppercase tracking-widest text-on-surface mb-8">Bản Tin</h4>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6">Đăng ký để nhận mẫu thiết kế mới nhất và ưu đãi đặc biệt.</p>
            <div className="flex flex-col gap-3">
              <input className="bg-surface border-none p-4 rounded-lg focus:ring-1 focus:ring-primary" placeholder="Email của bạn" type="email" />
              <button className="bg-primary text-white font-label-md text-label-md uppercase py-4 rounded-lg hover:bg-primary-container transition-all">Đăng Ký</button>
            </div>
          </div>
        </div>
        <div className="border-t border-outline-variant pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-body-md text-body-md text-on-surface-variant">© 2024 PHÙNG THỊ - Premium Trophy Manufacturing. All rights reserved.</p>
          <div className="flex gap-8 font-label-md text-label-md text-on-surface-variant uppercase tracking-widest">
            <a className="hover:text-primary transition-colors" href="#">Privacy Policy</a>
            <a className="hover:text-primary transition-colors" href="#">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
