import { Link } from "react-router";
import { Minus, Plus, Trash2 } from "lucide-react";

// In a real application, you would pass cart items as props.
export function CartItemList() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[600px]">
        <thead>
          <tr className="border-b border-outline-variant text-on-surface-variant font-label-md text-label-md uppercase tracking-widest">
            <th className="pb-4 font-semibold">Sản phẩm</th>
            <th className="pb-4 font-semibold text-center">Số lượng</th>
            <th className="pb-4 font-semibold text-right">Thành tiền</th>
            <th className="pb-4"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          <CartItemRow />
        </tbody>
      </table>
    </div>
  );
}

function CartItemRow() {
  return (
    <tr className="group">
      <td className="py-8">
        <div className="flex items-start space-x-6">
          <div className="w-32 h-32 bg-surface-container-low rounded overflow-hidden flex-shrink-0">
            <img 
              alt="Cúp Hợp Kim KL1" 
              className="w-full h-full object-contain mix-blend-multiply" 
              src="https://lh3.googleusercontent.com/aida/AP1WRLtl3on76FVJelVVoyPsexTbrjeVpVxYI8HDZ00kJgjSWHSIYwhkwnFUEzhep1b7kLcCoxNogxp3YQf1O0VjVwTqAvX-ROOmXaLSyghCLq3UmSenpEumHVPWEHMA9wRJFN_koZ1C7AEpJhMeuu0_GMGSmzRvoJhCxPG1sx26oneK0Lc-_dvlpoMfnrckg1Jhj5CPTXwJ3I437-r1MbCHnAuM0CppFACVOm9crzdNG1lucAsWu7yWq8pIE_8"
            />
          </div>
          <div className="flex flex-col space-y-1">
            <h3 className="font-bold text-on-background font-body-lg text-body-lg">Cúp Hợp Kim KL1</h3>
            <p className="text-on-surface-variant font-label-md text-label-md uppercase">Kích thước: M | Chất liệu: Vàng</p>
            <div className="mt-2 p-3 bg-surface-container-lowest border-l-2 border-primary-container italic text-on-surface font-body-md text-body-md">
              "Vinh Danh Nhân Viên Xuất Sắc 2024"
            </div>
            <p className="mt-2 font-bold text-primary font-body-md text-body-md">850.000đ</p>
          </div>
        </div>
      </td>
      <td className="py-8 align-middle">
        <div className="flex items-center justify-center">
          <div className="flex items-center border border-outline-variant rounded bg-white overflow-hidden">
            <button className="px-3 py-1 hover:bg-surface-container transition-colors active:scale-95">
              <Minus className="text-[18px]" />
            </button>
            <input 
              className="w-12 text-center border-none focus:ring-0 font-label-md text-label-md appearance-none m-0 p-0" 
              min="1" 
              style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
              type="number" 
              defaultValue="1"
            />
            <button className="px-3 py-1 hover:bg-surface-container transition-colors active:scale-95">
              <Plus className="text-[18px]" />
            </button>
          </div>
        </div>
      </td>
      <td className="py-8 align-middle text-right">
        <span className="font-bold text-on-background font-body-lg text-body-lg">850.000đ</span>
      </td>
      <td className="py-8 align-middle text-right">
        <button className="text-on-surface-variant hover:text-error transition-colors active:scale-95">
          <Trash2 />
        </button>
      </td>
    </tr>
  );
}
