const path = require("path");
const { forEach } = require("../data/dishes-data");

// Use the existing dishes data
const dishes = require(path.resolve("src/data/dishes-data"));

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

// MIDDLEWARE functions to be used in controller
// Verifying the dishId is a dish in dishes array
function dishExists(req, res, next) {
  const { dishId } = req.params;
  const dish = dishes.find((dish) => dish.id === dishId);

  if (dish === undefined) {
    return next({
      status: 404,
      message: `Dish does not exist: ${dishId}`,
    });
  } else {
    res.locals.dish = dish;
    res.locals.dishId = dishId;
    next();
  }
}

// Verifies name, description, image_url, price from req.body
function validateBody(req, res, next) {
  const { data } = req.body;
  const {
    data: { name, description, image_url, price },
  } = req.body;
  const properties = ["name", "description", "image_url", "price"];

  if (!data) {
    return next({ status: 400, message: `A 'data' property is required.` });
  }

  // checks to see if any property is missing or empty
  for (property of properties) {
    if (
      !data.hasOwnProperty(property) ||
      data[property] === "" ||
      data[property] === null
    ) {
      return next({ status: 400, message: `Dish must include a ${property}` });
    }
  }

  // check to verify price is an integer greater than 0
  if (!Number.isInteger(price) || price <= 0) {
    return next({
      status: 400,
      message: `Dish must have a price that is an integer greater than 0`,
    });
  }

  // set local variables to be used in other functions
  res.locals.name = name;
  res.locals.description = description;
  res.locals.image_url = image_url;
  res.locals.price = price;

  return next();
}

// Verifies the dish.id in the req.body matches the dishId in the route
function idMatchesRoute(req, res, next) {
  const id = req.body.data.id;
  const dishId = res.locals.dish.id;

  if (id && id !== dishId) {
    return next({
      status: 400,
      message: `Dish id does not match route id. Dish: ${id}, Route: ${dishId}`,
    });
  }
  return next();
}

// TODO: Implement the /dishes handlers needed to make the tests pass
function create(req, res) {
  const newDish = {
    id: nextId(),
    name: res.locals.name,
    description: res.locals.description,
    price: res.locals.price,
    image_url: res.locals.image_url,
  };
  console.log(newDish);
  dishes.push(newDish);
  res.status(201).json({ data: newDish });
}

function read(req, res) {
  const dish = res.locals.dish;
  res.status(200).json({ data: dish });
}

function update(req, res, next) {
  const dish = res.locals.dish;
  const updatedDish = {
    ...dish,
    id: res.locals.dishId,
    name: res.locals.name,
    description: res.locals.description,
    price: res.locals.price,
    image_url: res.locals.image_url,
  };

  console.log(updatedDish);

  const originalDish = res.locals.dish;
  const index = dishes.findIndex((dish) => originalDish.id === dish.id);

  dishes[index] = updatedDish;
  res.status(200).json({ data: dishes[index] });
}

function list(req, res) {
  res.status(200).json({ data: dishes });
}

module.exports = {
  list,
  create: [validateBody, create],
  read: [dishExists, read],
  update: [dishExists, idMatchesRoute, validateBody, update],
};
