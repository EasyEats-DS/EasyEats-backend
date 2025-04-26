const Delivery = require('../models/Delivery');

exports.getDeliveryById = async (deliveryId) => {
  try {
    const delivery = await Delivery.findById(deliveryId).populate('driverId').populate('customerId').populate('restaurantId');
    if (!delivery) {
      throw new Error('Delivery not found');
    }    
    return delivery;
  } catch (err) {
    console.error("Error fetching delivery by ID:", err.message);
    throw new Error('Server error');
  }
}

exports.getDeliveryByDriverId = async (req,res) => {
    const { driverId } = req.params;
    console.log("delivery controller driverId:", driverId); // Debugging line
  try {
    const deliveries = await Delivery.find({ driverId }).populate('customerId').populate('restaurantId');
    if (!deliveries) {
        return res.status(404).json({ message: 'No deliveries found for this driver' });
    }    
    res.status(200).json(deliveries);
  }
  catch (err) {
    console.error("Error fetching deliveries by driver ID:", err.message);
    res.status(500).json({ message: 'Server error' });
  }
}

exports.updateDeliveryStatus = async (req, res) => {
  const { deliveryId } = req.params;
  const { status } = req.body;
  console.log("delivery status update deliveryId:", deliveryId); // Debugging line
  console.log("delivery status update status:", status); // Debugging line

  try {
    const updatedDelivery = await Delivery.findByIdAndUpdate(
      deliveryId,
      { deliveryStatus: status },
      { new: true }
    ).populate('driverId').populate('customerId').populate('restaurantId');

    if (!updatedDelivery) {
      console.log("Delivery not found for update:", deliveryId); // Debugging line
      return res.status(404).json({ message: 'Delivery not found' });
    }

    res.status(200).json(updatedDelivery);
  } catch (err) {
    console.error("Error updating delivery status:", err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getDeliveryByCustomerId = async (req, res) => {
  const { customerId } = req.params;
  console.log("delivery controller customerId:", customerId); // Debugging line
  try {
    const deliveries = await Delivery.find({ customerId }).populate('driverId').populate('restaurantId');
    if (!deliveries) {
      return res.status(404).json({ message: 'No deliveries found for this customer' });
    }    
    res.status(200).json(deliveries);
  } catch (err) {
    console.error("Error fetching deliveries by customer ID:", err.message);
    res.status(500).json({ message: 'Server error' });
  }
}

