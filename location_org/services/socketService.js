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

    const name = driver.firstName;
    console.log(`Driver ${name} accepting order ${order._id}`);

    console.log('Driver ID:', driver._id.toString());
    driverToCustomerMap.set(driver._id.toString(), order.customer._id.toString());
    
    const driverSocketId = driverSocketMap.get(driver._id.toString());
    const customerSocket = customerSocketMap.get(order.customer._id);
    const customerLocation = order.customer.position;
    const cus = order.customer;
    
    if (driverSocketId) {
      io.to(driverSocketId).emit('customer_location', { cus, coords: customerLocation });
    }

    if (customerSocket) {
      console.log("aaaaaaaaaaaaaaa__________");
      io.to(customerSocket).emit('order_assigned', { name, order });
      
      const f = await axios.post(`http://localhost:5003/deliveries`, {
        orderId: order._id,
        dropoffLocation: order.dropoff,
        restaurantId: order.restaurantId,
        driverId: driver._id,
        customerId: order.customer._id,
        status: 'assigned',
        createdAt: new Date()
      });
      // await Delivery.create({
      //   orderId: order.orderId,
      //   dropoffLocation: order.dropoff,
      //   restaurantId: order.restaurantId,
      //   driverId: driver._id,
      //   customerId: order.customerId,
      //   status: 'assigned',
      //   createdAt: new Date()
      // });
      
      console.log(`Order ${order.orderId} assigned to driver ${name}`);
    }
  } catch (error) {
    console.error('Error in order acceptance:', error);
  }
};

const handleLiveLocation = async (io, { location, user }) => {
  console.log('Live location update:', { location, user });
  try {
    if (!location || !user) {
      throw new Error('Invalid location data');
    }

    const loc = [location.latitude, location.longitude];

    

      await axios.post('http://localhost:5003/users/updateLocation', {
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
  handleDisconnect,
  getSocketMaps: () => ({
    connectedDrivers,
    driverSocketMap,
    customerSocketMap,
    driverToCustomerMap
  })
};