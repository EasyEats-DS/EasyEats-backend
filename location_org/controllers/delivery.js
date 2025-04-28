const Delivery = require('../models/Delivery');
const axios = require('axios');



exports.createDelivery = async (delivery) => {
  console.log("delivery controller createDelivery called"); // Debugging line
  const { orderId, driverId, customerId, restaurantId, pickupLocation, dropoffLocation } = delivery;
  console.log("delivery controller orderId:", orderId); // Debugging line
  console.log("delivery controller driverId:", driverId); // Debugging line
  console.log("delivery controller customerId:", customerId); // Debugging line
  console.log("delivery controller restaurantId:", restaurantId); // Debugging line
  console.log("delivery controller pickupLocation:", pickupLocation); // Debugging line
  console.log("delivery controller dropoffLocation:", dropoffLocation); // Debugging line

  try {
    const newDelivery = new Delivery({
      orderId,
      driverId,
      customerId,
      restaurantId,
      pickupLocation,
      dropoffLocation,
      deliveryStatus: 'assigned'
    });

    const savedDelivery = await newDelivery.save();
    return savedDelivery;
    
  } catch (err) {
    console.error("Error creating delivery:", err.message);
    
  }
}

exports.deleteDeliveryById = async (deliveryId) => {
  console.log("delivery controller deleteDeliveryById called"); // Debugging line
  try {
    const deletedDelivery = await Delivery.findByIdAndDelete(deliveryId);
    if (!deletedDelivery) {
      throw new Error('Delivery not found');
    }
    return deletedDelivery;
  } catch (err) {
    console.error("Error deleting delivery:", err.message);
    throw new Error('Server error');
  }
}

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

// exports.getDeliveryByDriverId = async (req,res) => {
//     const { driverId } = req.params;
//     console.log("delivery controller driverId:", driverId); // Debugging line
//   try {
//     const deliveries = await Delivery.find({ driverId }).populate('customerId').populate('restaurantId');
//     if (!deliveries) {
//         return res.status(404).json({ message: 'No deliveries found for this driver' });
//     }    
//     res.status(200).json(deliveries);
//   }
//   catch (err) {
//     console.error("Error fetching deliveries by driver ID:", err.message);
//     res.status(500).json({ message: 'Server error' });
//   }
// }


exports.getDeliveryByCusId = async (cus_Id,token) => {
  const driverId = cus_Id;
  console.log("delivery controller customer__:", driverId, 'token',token); // Debugging line

  //console.log("delivery controller driverId:", driverId); // Debugging line
try {
  const deliveries = await Delivery.find({customerId: driverId })
  console.log("deliveries:", deliveries); // Debugging line
  //console.log("deliveries:", deliveries); // Debugging line
  //.populate('customerId').populate('restaurantId');
  const updatedDeliveries = await Promise.all(deliveries.map(async (order) => {
   // console.log("order:", order); // Debugging line
    let updatedOrder = { };
    
    try {
        const customer = await axios.get(`http://localhost:5003/users/d/${order.customerId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const driver = await axios.get(`http://localhost:5003/users/d/${order.driverId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        //console.log("1111111111111",driver.data)
        //console.log("customer:", customer.data); // Debugging line
        const restaurantDetails = await axios.get(`http://localhost:5003/restaurants/${order.restaurantId}`);
        //console.log("restaurantDetails:", restaurantDetails.data); // Debugging line
        
        updatedOrder = {
          ...order._doc,
          driverId:driver.data.user,
          customerId: customer.data.user,
          restaurantId: restaurantDetails.data

        }
        // order.customer = customer.data.user;
        // order.restaurant = restaurantDetails.data;
    } catch (error) {
        console.error("Error fetching customer or restaurant data cus:");
    }
    
    return updatedOrder;
}));

//console.log("deliveries with customer and restaurant details:", updatedDeliveries); //

  //console.log("deliveries with customer and restaurant details:", deliveries); // Debugging line
  //const customer = await axios.get(`http://localhost:5003/users/${order.payload.customerId}`);
  //const restaurantDetails = await axios.get(`http://localhost:5003/restaurants/${order.payload.restaurantId}`);
  
  if (!deliveries) {
      return res.status(404).json({ message: 'No deliveries found for this driver' });
  }    
  return updatedDeliveries;
}
catch (err) {
  console.error("Error fetching deliveries by driver ID:", err.message);
  //res.status(500).json({ message: 'Server error' });
}
}


exports.getDeliveryByDriverId = async (driver_Id,token) => {
  const driverId = driver_Id;
  console.log("delivery controller driverId:", driverId, 'token',token); // Debugging line
  //console.log("delivery controller driverId:", driverId); // Debugging line
try {
  const deliveries = await Delivery.find({ driverId })
  //console.log("deliveries:", deliveries); // Debugging line
  //.populate('customerId').populate('restaurantId');
  const updatedDeliveries = await Promise.all(deliveries.map(async (order) => {
   // console.log("order:", order); // Debugging line
    let updatedOrder = { };
    
    try {
        const customer = await axios.get(`http://localhost:5003/users/d/${order.customerId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        //console.log("customer:", customer.data); // Debugging line
        const restaurantDetails = await axios.get(`http://localhost:5003/restaurants/${order.restaurantId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        //console.log("restaurantDetails:", restaurantDetails.data); // Debugging line
        
        updatedOrder = {
          ...order._doc,
          customerId: customer.data.user,
          restaurantId: restaurantDetails.data

        }
        // order.customer = customer.data.user;
        // order.restaurant = restaurantDetails.data;
    } catch (error) {
        console.error("Error fetching customer or restaurant data: driver");
    }
    
    return updatedOrder;
}));

//console.log("deliveries with customer and restaurant details:", updatedDeliveries); //

  //console.log("deliveries with customer and restaurant details:", deliveries); // Debugging line
  //const customer = await axios.get(`http://localhost:5003/users/${order.payload.customerId}`);
  //const restaurantDetails = await axios.get(`http://localhost:5003/restaurants/${order.payload.restaurantId}`);
  
  if (!deliveries) {
      return res.status(404).json({ message: 'No deliveries found for this driver' });
  }    
  return updatedDeliveries;
}
catch (err) {
  console.error("Error fetching deliveries by driver ID:", err.message);
  //res.status(500).json({ message: 'Server error' });
}
}

exports.updateDeliveryStatus = async (diverId,statuss) => {
  const deliveryId  = diverId;
  const status  = statuss;
  console.log("delivery status update deliveryId:", deliveryId); // Debugging line
  console.log("delivery status update status:", status); // Debugging line

  try {
    const updatedDelivery = await Delivery.findByIdAndUpdate(
      deliveryId,
      { deliveryStatus: status },
      { new: true }
    )//.populate('driverId').populate('customerId').populate('restaurantId');

    if (!updatedDelivery) {
      console.log("Delivery not found for update:", deliveryId); // Debugging line
      throw new Error('Delivery not found');
    }

    return updatedDelivery;
  } catch (err) {
    console.error("Error updating delivery status:", err.message);
    throw new Error('Server error');
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



