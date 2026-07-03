const policies = [
  {
    title: "Delivery Policy",
    body: "Delivery is available within 20 km of Tapas Grocery Store, Hatimuri. Within 300 meters the fee is ₹3; after that ₹1 is added for every 100 meters, with free delivery rules applied automatically."
  },
  {
    title: "Refund Policy",
    body: "Refunds can be requested for cancelled, missing, or damaged orders. The owner can approve, reject, or mark refunds as completed from the admin dashboard."
  },
  {
    title: "Privacy Policy",
    body: "Customer phone numbers, addresses, order history, and location coordinates are used only for delivery, support, and order management."
  },
  {
    title: "Terms of Use",
    body: "Orders depend on product availability, delivery area, a valid mobile number, and a complete delivery address."
  }
];

export default function PoliciesPage() {
  return (
    <main className="app-bg min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-primary-accent">Tapas Grocery Store</p>
        <h1 className="mt-2 text-4xl font-black text-heading">Policies</h1>
      <div className="mt-8 space-y-4">
        {policies.map((policy) => (
          <section key={policy.title} className="premium-card rounded-2xl p-5 hover:shadow-soft transition">
            <h2 className="text-xl font-black text-heading">{policy.title}</h2>
            <p className="mt-2 leading-7 text-slate-500">{policy.body}</p>
          </section>
        ))}
      </div>
      </div>
    </main>
  );
}
