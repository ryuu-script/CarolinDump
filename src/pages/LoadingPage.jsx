import { useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import LoadingScreen from "../components/LoadingScreen.jsx";

// Reads the destination from the URL (/loading?to=/student), waits for the loading bar to finish, then redirects there.
function LoadingPage() {
    const navigate = useNavigate();
    const [params] = useSearchParams();

    // Only allow in-app paths, so the link can't send people to other sites.
    const to = params.get("to");
    const destination = to && to.startsWith("/") && !to.startsWith("//") ? to : "/";

    // `replace` swaps the loading page out of history, so the Back button doesn't land people on the loading screen again.
    const handleComplete = useCallback(
        () => navigate(destination, { replace: true }),
        [navigate, destination]
    );

    return <LoadingScreen onComplete={handleComplete} />;
}

export default LoadingPage;