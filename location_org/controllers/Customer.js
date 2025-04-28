// const Customer = require('../models/Customer');

//   exports.getCustomerById = async (customerId) => {
//     try {
//       const customer = await Customer.findById(customerId);
//       if (!customer) {
//         throw new Error('Customer not found');
//       }
//         return customer;
//     } catch (err) {
//       console.error("Error fetching customer by ID:", err.message);
//       throw new Error('Server error');}
//   }

//   exports.updateLocation =  async (location,customerId) =>{
//     try {
//       const customer = await Customer.findById(customerId);
//       if (!customer) {
//         throw new Error('Customer not found');
//       }
//       console.log("Customer  ___________pre",customer);
//       customer.position = location;
//       console.log("Customer  ___________post",customer);
//       await customer.save();
//       return customer;
//     } catch (err) {
//       console.error("Error updating customer location:", err.message);
//       throw new Error('Server error');
//     }
//   }