const Joi = require("joi");
const express = require("express");

const BaseController = require("../base");
const OrderModel = require("../../models/order");
const CarsModel = require("../../models/cars");
const { authorize, checkRole } = require("../../middlewares/authorization");
const ValidationError = require("../../helpers/errors/validation");
const { createInvoice } = require("../../helpers/createInvoice");
const router = express.Router();

const order = new OrderModel();
const cars = new CarsModel();

const orderSchema = Joi.object({
  car_id: Joi.number().required(),
  start_time: Joi.date().required(),
  end_time: Joi.date().required(),
  is_driver: Joi.boolean().required(),
});

class OrderController extends BaseController {
  constructor(model) {
    super(model);
    router.get("/", this.getAll);
    router.post("/", this.validation(orderSchema), authorize, this.create);
    router.get("/:id/invoice", authorize, this.downloadInvoice);
    router.put("/:id/payment", authorize, this.payment);
    // router.get("/:id", this.get);
    // router.put("/:id", this.validation(carSchema), authorize, checkRole(['admin']), this.update);
    // router.delete("/:id", this.delete);
  }

  create = async (req, res, next) => {
    try {
      const getCars = await cars.getOne({
        where: {
          id: req.body.car_id,
          isAvailable: true,
          isDriver: req.body.is_driver,
        },
        select: {
          price: true,
        },
      });

      if (!getCars)
        return next(new ValidationError("Car not found or is not available!"));

      const getLastOrderToday = await this.model.count({
        where:{
          createdDt: {
            lte: new Date(),
          },
        }
      });
      console.log(getLastOrderToday, new Date());
      const currentDate = new Date();
      const startTime = new Date(req.body.start_time);
      const endTime = new Date(req.body.end_time);
      const total =
        getCars.price * ((endTime - startTime) / 1000 / 60 / 60 / 24);
      const invNumber = `INV/${currentDate.getFullYear()}/${
        currentDate.getMonth() + 1
      }/${currentDate.getDate()}/${getLastOrderToday + 1}`;

      const [result, carUpdate] = await this.model.transaction([
        this.model.set({
          order_no: invNumber,
          start_time: startTime,
          end_time: endTime,
          is_driver: req.body.is_driver,
          status: "pending",
          is_expired: false,
          createdBy: req.user.fullname,
          updatedBy: req.user.fullname,
          total,
          cars: {
            connect: {
              id: req.body.car_id,
            },
          },
          users: {
            connect: {
              id: req.user.id,
            },
          },
        }),
        cars.update(req.body.car_id, { isAvailable: false }),
      ]);

      return res.status(200).json(
        this.apiSend({
          code: 200,
          status: "success",
          message: "Order created successfully",
          data: result,
        })
      );
    } catch (error) {
      return next(error);
    }
  };

  payment = async (req, res, next) => {
    const { id } = req.params;
    try {
      const { payment } = req.body;
      const order = await this.model.getById(id);

      if (payment !== order.total) {
        return next(new ValidationError("Payment not valid"));
      }

      const orderPaid = await this.model.update(id, {
        status: "paid",
      });

      return res.status(200).json(
        this.apiSend({
          code: 200,
          status: "success",
          message: "Order Paid successfully",
          data: orderPaid,
        })
      );
    } catch (error) {
      return next(error);
    }
  };

  downloadInvoice = async (req, res, next) => {
    const { id } = req.params;
    try {
      const order = await this.model.getById(id, {
        order_no: true,
        createdDt: true,
        status: true,
        user_id: true,
        start_time: true,
        end_time: true,
        total: true,
        cars: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
        users:{
          select:{
            id: true,
            fullname: true,
            address: true
          }
        }
      });
     
      if (order.status !== "paid") {
        return next(new ValidationError("Order not paid!"));
      }

      createInvoice(order, res);
    } catch (error) {
      return next(error);
    }
  };
}

new OrderController(order);

module.exports = router;
