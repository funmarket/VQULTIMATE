/** Deployment-only transport; source-matching behavior comes from the unmodified ZIP. */
import { handleVercelPlaceApi } from '../../server/vercelPlaceApi.mjs';
export default (req, res) => handleVercelPlaceApi(req, res, 'resolve');
