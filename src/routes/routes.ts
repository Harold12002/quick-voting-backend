import { Router } from "../../imports.ts";
import { authMiddleware } from "../authMiddleware.ts";
import { CandidatesController } from "../controllers/candidatesController.ts";
import { UserController } from "../controllers/userController.ts";
import { VotingController } from "../controllers/votingController.ts";
import { roleMiddleware } from "../helpers/loginHelper.ts";

const userController = new UserController();
const candidatesController = new CandidatesController();
const votesController = new VotingController();

const router = new Router();

//unprotected routes
router.post("/register", userController.handleRegister);
router.post("/login", userController.handleLogin);
router.get("/candidates", candidatesController.getCandidates);
router.get("/results", votesController.getResults);
router.get("/votes/:id", votesController.getVotesForCandidate);
router.post("/request-password-reset", userController.requestPasswordReset);
router.post("/reset-password", userController.resetPassword);

//protected routes
router.post("/vote", authMiddleware, votesController.castVote);

//Admin routes
router.post(
  "/addCandidate",
  authMiddleware,
  roleMiddleware("Admin"),
  candidatesController.addCandidates,
);

router.delete(
  "/deleteUser",
  authMiddleware,
  roleMiddleware("Admin"),
  userController.removeUser,
);

router.get(
  "/reset",
  authMiddleware,
  roleMiddleware("Admin"),
  votesController.reset,
);

router.delete(
  "/deleteCandidate",
  authMiddleware,
  roleMiddleware("Admin"),
  candidatesController.removeCandidate,
);

//router.post('/admin-login/',authMiddleware,
//  roleMiddleware("Admin"), userController.handleAdminLogin);

export default router;
