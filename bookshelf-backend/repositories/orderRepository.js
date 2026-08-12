import Order from '../models/Order.js';

class OrderRepository {
  async findByUserId(userId) {
    return await Order.find({ userId }).sort({ createdAt: -1 });
  }

  async findById(id) {
    return await Order.findById(id);
  }

  async findAll() {
    return await Order.find({}).sort({ createdAt: -1 });
  }

  async create(orderData) {
    const order = new Order(orderData);
    return await order.save();
  }

  async save(orderDocument) {
    return await orderDocument.save();
  }
}

export default new OrderRepository();
