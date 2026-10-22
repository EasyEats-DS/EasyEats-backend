const Delivery = require('../models/Delivery');
const { updateLocation} = require('../controllers/Customer');
const { updateDriverLocation } = require('../controllers/Driver');
const { getMapData } = require('../utils/maps');
const axios = require('axios');

// Track connections
const connectedDrivers = new Map(); // socketId => driverId
const driverSocketMap = new Map();  // driverId => socketId
const customerSocketMap = new Map(); // customerId => socketId
const driverToCustomerMap = new Map(); // driverId => customerId

const handleConnection = async (socket) => {
  console.log('New socket connection:', socket.id);
  try {
    const mapData = await getMapData();
    // const map = {
    //   availableDrivers:mapData.availableDrivers.data.data.data.users,
    //   restaurants: mapData.restaurants.data
    // }
    //console.log('Map data fetched:', mapData);
    console.log('Map data fetched:', mapData.availableDrivers);
    socket.emit('map:init', mapData);
  } catch (error) {
    console.error('Error initializing map data:', error);
  }
};

const handleIdentification = (socket, { role, id }) => {
  if (!role || !id) {
    console.warn('Invalid identification data:', { role, id });
    return;
  }

  console.log(`Identified ${role} with ID: ${id} and socket ID: ${socket.id}`);

  if (role === 'driver') {
    // Clean up if this socket or id was registered as customer
    customerSocketMap.delete(id);
    for (const [cId, sId] of customerSocketMap.entries()) {
      if (sId === socket.id) customerSocketMap.delete(cId);
    }

    const oldSocketId = driverSocketMap.get(id);
    if (oldSocketId && oldSocketId !== socket.id) {
      const oldSocket = socket.server.sockets.sockets.get(oldSocketId);
      if (oldSocket) {
        console.log(`Disconnecting previous socket ${oldSocketId} for driver ${id}`);
        oldSocket.disconnect(true);
      }
    }

    connectedDrivers.set(socket.id, id);
    driverSocketMap.set(id, socket.id);
  } else if (role === 'customer') {
    // Remove from driver maps if socket or id was previously registered as driver
    connectedDrivers.delete(socket.id);
    driverSocketMap.delete(id);
    for (const [dId, sId] of driverSocketMap.entries()) {
      if (sId === socket.id) driverSocketMap.delete(dId);
    }

    const oldSocketId = customerSocketMap.get(id);
    if (oldSocketId && oldSocketId !== socket.id) {
      const oldSocket = socket.server.sockets.sockets.get(oldSocketId);
      if (oldSocket) {
        console.log(`Disconnecting previous socket ${oldSocketId} for customer ${id}`);
        oldSocket.disconnect(true);
      }
    }

    customerSocketMap.set(id, socket.id);
  }
};

const handleAcceptOrder = async (io, socket, { driver, order }) => {
  console.log('Driver accepted order:', { driver, order });
  try {
    if (!driver || !order) {
      throw new Error('Invalid order acceptance data');
    }

    const name = driver.firstName || 'Driver';
    const driverId = (driver._id || driver.id || '').toString();
    const customerId = (order.customer?._id || order.userId || '').toString();

    // Prevent customer from accepting their own order as driver
    if (driverId && customerId && driverId === customerId) {
      console.warn('Rejecting order acceptance: ordering customer cannot accept their own delivery', { driverId, customerId });
      return;
    }

    console.log(`Driver ${name} (${driverId}) accepting order ${order._id || order.orderId}`);

    if (driverId && customerId) {
      driverToCustomerMap.set(driverId, customerId);
    }
    
    const driverSocketId = driverSocketMap.get(driverId) || socket.id;
    const customerSocket = customerSocketMap.get(customerId);
    const customerLocation = order.customer?.position?.coordinates || [6.9271, 79.8612];
    const cus = order.customer || {};
    
    if (driverSocketId) {
      io.to(driverSocketId).emit('customer_location', { cus, coords: customerLocation });
      io.to(driverSocketId).emit('order_assigned_driver', { order });
    }

    if (customerSocket) {
      io.to(customerSocket).emit('order_assigned', { name, order });
    }

    const pickupLocation = {
      address: order.restaurant?.address?.street 
        ? `${order.restaurant.address.street}, ${order.restaurant.address.city || ''}` 
        : (order.restaurant?.name || 'Restaurant'),
      lat: order.restaurant?.position?.coordinates?.[0] || 6.9271,
      lng: order.restaurant?.position?.coordinates?.[1] || 79.8612,
    };

    const dropoffLocation = {
      address: order.deliveryAddress 
        || (order.customer?.address?.street ? `${order.customer.address.street}, ${order.customer.address.city || ''}` : 'Customer Address'),
      lat: order.customer?.position?.coordinates?.[0] || 6.9271,
      lng: order.customer?.position?.coordinates?.[1] || 79.8612,
    };

    try {
      const f = await axios.post(`http://api-gateway:5003/deliveries`, {
        orderId: (order._id || order.orderId || Date.now()).toString(),
        products: order.products || [],
        totalPrice: order.totalAmount || 0,
        paymentMethod: order.paymentMethod || 'cash',
        pickupLocation,
        dropoffLocation,
        restaurantId: order.restaurantId,
        driverId: driver._id || driver.id || driverId,
        customerId: order.customer?._id || order.userId,
        status: 'assigned',
        createdAt: new Date()
      });
      console.log("Delivery created successfully in API Gateway:", f.data);
    } catch (deliveryPostErr) {
      console.error("Error creating delivery in API Gateway:", deliveryPostErr.message);
    }
      
    console.log(`Order ${order.orderId || order._id} assigned to driver ${name}`);
  } catch (error) {
    console.error('Error in order acceptance:', error);
  }
};

const handleOrderStatusUpdate = (io, { orderId }) => {
  const driverId = orderId.driverId;
  const customerId = orderId.customerId;
  const customerSocket = customerSocketMap.get(customerId);
  console.log("customerSocket", customerSocket);
  console.log('Order status update:', { orderId });
  let dorder;
  if(orderId.deliveryStatus === 'in_progress'){
    dorder = 'shipped';
  }
  if(orderId.deliveryStatus === 'completed'){
    dorder = 'delivered';
  }

  try {
    if (!orderId) {
      throw new Error('Invalid order status update data');
    }

    io.to(customerSocket).emit('order_status_updated', { orderId });
  } catch (error) {
    console.error('Error updating order status:', error);
  }
};


const handleLiveLocation = async (io, { location, user }) => {
  console.log('Live location update:', { location, user });
  try {
    if (!location || !user) {
      throw new Error('Invalid location data');
    }
    console.log("location",location);
    console.log("user",user);
    const loc = [location.latitude, location.longitude];

    

      await axios.post('http://api-gateway:5003/users/updateLocation', {
        location: location,
        customerId: user._id
      });
    
    // if (user.role === 'customer') {
    //   await updateLocation(loc, user._id);
    // } else if (user.role === 'driver') {
    //   await updateDriverLocation(loc, user._id);
    // }
    
    io.emit('location_updated', { 
      userId: user._id, 
      role: user.role, 
      location: loc 
    });
  } catch (error) {
    console.error('Error updating live location:', error);
  }
};

const handleDisconnect = (socket) => {
  const driverId = connectedDrivers.get(socket.id);
  if (driverId) {
    connectedDrivers.delete(socket.id);
    driverSocketMap.delete(driverId);
    driverToCustomerMap.delete(driverId);
  }
};

module.exports = {
  handleConnection,
  handleIdentification,
  handleAcceptOrder,
  handleLiveLocation,
  handleOrderStatusUpdate,
  handleDisconnect,
  getSocketMaps: () => ({
    connectedDrivers,
    driverSocketMap,
    customerSocketMap,
    driverToCustomerMap
  })
};