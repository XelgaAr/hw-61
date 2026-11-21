import { Router } from 'express';
import { catalogController } from '../controllers/catalog.js';
import { createCollection } from '../models/catalog.js';
import { readJson } from '../middleware/http.js';
import { authenticated, mayEdit } from '../middleware/session.js';
import { validateBody, validateId } from '../middleware/validate.js';

export function catalogRouter(resource, idParam) {
  const router = Router();
  const controller = catalogController(createCollection(resource));
  const validate = validateBody(resource);
  router.use(authenticated);
  router.param(idParam, validateId);
  router.route('/')
    .get(controller.list)
    .post(mayEdit, readJson, validate, controller.create);
  router.route(`/:${idParam}`)
    .get(controller.load, controller.show)
    .put(mayEdit, controller.load, readJson, validate, controller.update)
    .patch(mayEdit, controller.load, readJson, validateBody(resource, true), controller.update)
    .delete(mayEdit, controller.load, controller.remove);
  return router;
}
