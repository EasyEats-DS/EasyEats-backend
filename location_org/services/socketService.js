const Delivery = require('../models/Delivery');
const { updateLocation} = require('../controllers/Customer');
const { updateDriverLocation } = require('../controllers/Driver');
const { getMapData } = require('../utils/maps');

// Track connections
const connectedDrivers = new Map(); // socketId => driverId
const driverSocketMap = new Map();  // driverId => socketId
const customerSocketMap = new Map(); // customerId => socketId
const driverToCustomerMap = new Map(); // driverId => customerId

const handleConnection = async (socket) => {
  try {
    const mapData = await getMapData();
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

  console.log(`Identified ${role} with ID: ${id}`);
  
  if (role === 'driver') {
    connectedDrivers.set(socket.id, id);
    driverSocketMap.set(id, socket.id);
  } else if (role === 'customer') {
    customerSocketMap.set(id, socket.id);
  }
};

const handleAcceptOrder = async (io, socket, { driver, order }) => {
  try {
    if (!driver || !order) {
      throw new Error('Invalid order acceptance data');
    }

    const name = driver.name;
    console.log(`Driver ${name} accepting order ${order.orderId}`);

    driverToCustomerMap.set(driver._id.toString(), order.customerId.toString());
    
    const driverSocketId = driverSocketMap.get(driver._id.toString());
    const customerSocket = customerSocketMap.get(order.customerId);
    const customerLocation = order.customer.position;
    const cus = order.customer;
    
    if (driverSocketId) {
      io.to(driverSocketId).emit('customer_location', { cus, coords: customerLocation });
    }

    if (customerSocket) {
      io.to(customerSocket).emit('order_assigned', { name, order });
      
      await Delivery.create({
        orderId: order.orderId,
        dropoffLocation: order.dropoff,
        restaurantId: order.restaurantId,
        driverId: driver._id,
        customerId: order.customerId,
        status: 'assigned',
        createdAt: new Date()
      });
      
      console.log(`Order ${order.orderId} assigned to driver ${name}`);
    }
  } catch (error) {
    console.error('Error in order acceptance:', error);
  }
};

const handleLiveLocation = async (io, { location, user }) => {
  try {
    if (!location || !user) {
      throw new Error('Invalid location data');
    }

    const loc = [location.latitude, location.longitude];
    
    if (user.role === 'customer') {
      await updateLocation(loc, user._id);
    } else if (user.role === 'driver') {
      await updateDriverLocation(loc, user._id);
    }
    
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