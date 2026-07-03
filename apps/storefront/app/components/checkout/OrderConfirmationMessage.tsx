import { Link } from "react-router";

export function OrderConfirmationMessage() {
  return (
    <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-base">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-container/10 mb-8">
        <span className="material-symbols-outlined text-primary text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
      </div>
      
      <h1 className="font-headline-lg text-[48px] md:text-headline-lg text-primary uppercase">Cảm ơn bạn!</h1>
      
      <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
        Đơn hàng của bạn đã được tiếp nhận thành công. Chúng tôi đang bắt đầu quá trình chế tác tinh xảo để mang đến sự vinh danh xứng đáng nhất.
      </p>
      
      {/* Trophy Asset Injection */}
      <div className="relative w-full max-w-md mt-12 py-12 flex justify-center lg:justify-start">
        <style>
          {`
            @keyframes float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-20px); }
            }
            .animate-float {
                animation: float 6s ease-in-out infinite;
            }
          `}
        </style>
        <img 
          alt="Premium Trophy" 
          className="w-full h-auto drop-shadow-[0_20px_30px_rgba(135,82,0,0.15)] object-contain animate-float" 
          src="https://lh3.googleusercontent.com/aida/AP1WRLvo3s4X-fjp6X2vstVBWd1Z6G1tAJzcAhtZVg9uo55MhkU-TsIhxuwOFw_TtjwKWQty_C99fAMb05vp_vKWJSjH_4TzZyo9awfByNAPNDXGkBHYq9gJrrnAZX3AVg1_lJFAAweRfGEBIaBfutaO7qXZ4F4jdmRF6t45IBMWcUOi1ehcmkDECRTHlPT1xHVeAVT9d7Zrrm9cVFKD70CgBbv5Wz0M5YkZ5ICQb042bPdf9JMIq7-de8C9YJA"
        />
        {/* Decorative glow behind trophy */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary-container/20 blur-[100px] -z-10"></div>
      </div>
      
      <div className="pt-12 w-full">
        <Link 
          to="/products" 
          className="inline-flex items-center justify-center bg-primary text-on-primary px-12 py-5 rounded-full font-label-md text-label-md uppercase tracking-widest hover:bg-surface-tint transition-all duration-300 shadow-lg shadow-primary/20"
        >
          Tiếp Tục Mua Sắm
          <span className="material-symbols-outlined ml-2">arrow_forward</span>
        </Link>
      </div>
    </div>
  );
}
