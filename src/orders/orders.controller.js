const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

//MIDDLEWARE function
// Verifying the orderId is an order in orders array
function orderExists(req, res, next) {
  const { orderId } = req.params;
  const order = orders.find((order) => order.id === orderId);

  if (order === undefined) {
    return next({
      status: 404,
      message: `Order does not exist: ${orderId}`,
    });
  } else {
    res.locals.order = order;
    res.locals.orderId = orderId;
    next();
  }
}

// Verifies deliverTo, mobileNumber, dishes, dishes.quantity from req.body
function validateBody(req, res, next) {
  const data = req.body.data;

  if (!data) {
    return next({ status: 400, message: `A 'data' property is required.` });
  }

  const properties = ["deliverTo", "mobileNumber", "dishes"];

  for (property of properties) {
    console.log("property: ", property);
    if (
      !data.hasOwnProperty(property) ||
      data[property] === "" ||
      data[property] === null
    ) {
      if (property === "dishes") {
        return next({ status: 400, message: `Order must include a dish` });
      } else {
        return next({
          status: 400,
          message: `Order must include a ${property}`,
        });
      }
    }
  }

  // Verifies the dishes property is an array that is not empty
  const dishes = data.dishes;
  if (!Array.isArray(dishes) || dishes.length === 0) {
    return next({
      status: 400,
      message: "Order must include at least one dish",
    });
  }

  // Verifies each dish in the dishes array is an integer > 0 and not missing
  for (dish of dishes) {
    const index = dishes.indexOf(dish);

    if (
      !Number.isInteger(dish.quantity) ||
      dish.quantity <= 0 ||
      dish.quantity === undefined
    ) {
      return next({
        status: 400,
        message: `Dish ${index} must have a quantity that is an integer greater than 0`,
      });
    }
  }
  res.locals.orderDataFromBody = data;
  return next();
}

// Verifies the status of the order is valid
function validateStatus(req, res, next) {
  const order = res.locals.order;
  console.log(order);
  // Only checks the pending status if request is a DELETE request
  if (req.method === "DELETE") {
    if (order.status !== "pending") {
      return next({
        status: 400,
        message: "An order cannot be deleted unless it is pending",
      });
    } else {
      return next();
    }
  }

  // continues with validation if method isn't delete or it is pending
  const status = req.body.data.status;
  const validStatuses = [
    "pending",
    "preparing",
    "out-for-delivery",
    "delivered",
  ];

  if (
    !status ||
    status === undefined ||
    status === "" ||
    !validStatuses.includes(status)
  ) {
    return next({
      status: 400,
      message:
        "Order must have a status of pending, preparing, out-for-delivery, delivered",
    });
  }

  if (status === "delivered") {
    return next({
      status: 400,
      message: "A delivered order cannot be changed",
    });
  }
  return next();
}

// This will determine if the orderId in the body matched the orderId in the route
function idMatchesRoute(req, res, next) {
  const id = req.body.data.id;
  const orderId = res.locals.orderId;

  if (id && id !== orderId) {
    return next({
      status: 400,
      message: `Order id does not match route id. Order: ${id}, Route: ${orderId}`,
    });
  }
  return next();
}

// TODO: Implement the /orders handlers needed to make the tests pass
function create(req, res) {
  const order = res.locals.orderDataFromBody;

  const newOrder = {
    id: nextId(),
    deliverTo: order.deliverTo,
    mobileNumber: order.mobileNumber,
    dishes: order.dishes,
  };

  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}

function read(req, res) {
  const foundOrder = res.locals.order;
  res.status(200).json({ data: foundOrder });
}

function update(req, res) {
  const orderDataFromBody = res.locals.orderDataFromBody;

  const updatedOrder = {
    ...res.locals.order,
    id: res.locals.orderId,
    deliverTo: orderDataFromBody.deliverTo,
    mobileNumber: orderDataFromBody.mobileNumber,
    dishes: orderDataFromBody.dishes,
  };

  const originalOrder = res.locals.order;
  const index = orders.findIndex((order) => originalOrder.id === order.id);
  console.log("index: ", index);

  orders[index] = updatedOrder;
  console.log("orders[index]", orders[index]);
  res.status(200).json({ data: updatedOrder });
}

function destroy(req, res, next) {
  orders.splice(orders.indexOf(res.locals.order), 1);
  res.sendStatus(204);
}

function list(req, res) {
  res.status(200).json({ data: orders });
}

module.exports = {
  list,
  create: [validateBody, create],
  read: [orderExists, read],
  update: [orderExists, idMatchesRoute, validateBody, validateStatus, update],
  delete: [orderExists, validateStatus, destroy],
};
