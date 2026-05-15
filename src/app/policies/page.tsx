const policies = [
  {
    title: "Delivery Policy",
    body: "Delivery is available within 2 km of Tapas Grocery Store, Hatimuri. Fees are calculated automatically from the selected map location and cart total."
  },
  {
    title: "Refund Policy",
    body: "Refunds can be requested for cancelled, missing, or damaged orders. The owner can approve, reject, or mark refunds as completed from the admin dashboard."
  },
  {
    title: "Privacy Policy",
    body: "Customer phone numbers, addresses, order history, and location coordinates are used only for login, delivery, support, and order management."
  },
  {
    title: "Terms of Use",
    body: "Orders depend on product availability, delivery area, verified phone login, and a complete delivery address."
  }
];

export default function PoliciesPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-sm font-black uppercase tracking-[0.16em] text-leaf-700">Tapas Grocery Store</p>
      <h1 className="mt-2 text-4xl font-black text-ink">Policies</h1>
      <div className="mt-8 space-y-4">
        {policies.map((policy) => (
          <section key={policy.title} className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-ink">{policy.title}</h2>
            <p className="mt-2 leading-7 text-ink/70">{policy.body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
