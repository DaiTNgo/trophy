export function BillingDetails() {
  return (
    <section>
      <h2 className="font-headline-md text-headline-md text-on-surface mb-8">Billing Details</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Full Name</label>
          <input className="w-full bg-surface-container-low border-none rounded-none py-4 px-4 focus:ring-0 outline-none focus:border-b-2 focus:border-primary" placeholder="e.g. Nguyễn Văn A" type="text" />
        </div>
        <div>
          <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Phone</label>
          <input className="w-full bg-surface-container-low border-none rounded-none py-4 px-4 focus:ring-0 outline-none focus:border-b-2 focus:border-primary" placeholder="+84 000 000 000" type="tel" />
        </div>
        <div>
          <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Email Address</label>
          <input className="w-full bg-surface-container-low border-none rounded-none py-4 px-4 focus:ring-0 outline-none focus:border-b-2 focus:border-primary" placeholder="name@example.com" type="email" />
        </div>
        <div className="md:col-span-2">
          <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Address</label>
          <input className="w-full bg-surface-container-low border-none rounded-none py-4 px-4 focus:ring-0 outline-none focus:border-b-2 focus:border-primary" placeholder="Street name and number" type="text" />
        </div>
        <div className="md:col-span-2">
          <label className="block font-label-md text-label-md text-on-surface-variant mb-2">City / District</label>
          <input className="w-full bg-surface-container-low border-none rounded-none py-4 px-4 focus:ring-0 outline-none focus:border-b-2 focus:border-primary" placeholder="e.g. Ho Chi Minh City" type="text" />
        </div>
      </div>
    </section>
  );
}
