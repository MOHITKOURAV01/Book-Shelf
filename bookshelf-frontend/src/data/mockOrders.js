export const mockOrders = [
  {
    id: "ORD-1001",
    createdAt: "2026-07-27",
    total: 34.98,
    paymentStatus: "Paid",
    shippingStatus: "Shipped",
    items: [
      {
        id: "1",
        title: "The Great Gatsby",
        author: "F. Scott Fitzgerald",
        price: 15.99,
        quantity: 1,
        image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=800&auto=format&fit=crop"
      },
      {
        id: "2",
        title: "To Kill a Mockingbird",
        author: "Harper Lee",
        price: 18.99,
        quantity: 1,
        image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=800&auto=format&fit=crop"
      }
    ]
  },
  {
    id: "ORD-1002",
    createdAt: "2026-07-20",
    total: 10.99,
    paymentStatus: "Paid",
    shippingStatus: "Delivered",
    items: [
      {
        id: "3",
        title: "1984",
        author: "George Orwell",
        price: 10.99,
        quantity: 1,
        image: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=800&auto=format&fit=crop"
      }
    ]
  }
];
