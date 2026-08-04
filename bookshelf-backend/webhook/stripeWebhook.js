import Order from '../models/Order.js';
import { verifyWebhookSignature } from '../services/stripeService.js';
import dotenv from 'dotenv';

dotenv.config();

const stripeWebhookHandler = async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_mock_webhook_secret_123';

  let event;
  try {
    event = verifyWebhookSignature(req.body, signature, webhookSecret);
  } catch (error) {
    console.error(`Webhook signature verification failed: ${error.message}`);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata.orderId;
        
        if (orderId) {
          const order = await Order.findById(orderId);
          if (order && order.paymentStatus !== 'paid') {
            order.paymentStatus = 'paid';
            order.status = 'confirmed';
            order.transactionId = paymentIntent.id;
            order.paidAt = new Date();
            
            // Generate receipt number
            const receiptPrefix = 'RCPT-' + new Date().getFullYear() + '-';
            const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
            order.receiptNumber = receiptPrefix + randomString;

            await order.save();
            console.log(`Order ${orderId} successfully paid.`);
          }
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata.orderId;
        
        if (orderId) {
          const order = await Order.findById(orderId);
          if (order) {
            order.paymentStatus = 'failed';
            order.status = 'payment_failed';
            await order.save();
            console.log(`Order ${orderId} payment failed.`);
          }
        }
        break;
      }
      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata.orderId;
        
        if (orderId) {
          const order = await Order.findById(orderId);
          if (order) {
            order.paymentStatus = 'canceled';
            order.status = 'canceled';
            await order.save();
            console.log(`Order ${orderId} payment canceled.`);
          }
        }
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error(`Webhook handler error: ${error.message}`);
    res.status(500).send(`Webhook Handler Error: ${error.message}`);
  }
};

export default stripeWebhookHandler;
