/*
Purpose: Route that shows the loading screen and then redirects to the page named in the URL.
Dependencies:
         JSX: components/Loading_Screen.jsx
         CSS: NULL
         JS: NULL
*/

// imports
import { useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import LoadingScreen from "../components/Loading_Screen.jsx";

/*
Purpose: Reads the destination from the URL and redirects there once the loading screen finishes.
Parameters: NULL
Return value:
       type: JSX.Element
       description: the loading screen
*/
function Page_Loading() {
    const navigate = useNavigate();
    const [params] = useSearchParams();

    // Only allow in-app paths, so the link can't send people to other sites.
    const to = params.get("to");
    const destination = to && to.startsWith("/") && !to.startsWith("//") ? to : "/";

    /*
    Purpose: Redirects to the destination, replacing the loading page in history so Back does not return to it.
    Parameters: NULL
    Return value:
           type: void
           description: NULL
    */
    const handleComplete = useCallback(
        () => navigate(destination, { replace: true }),
        [navigate, destination]
    );

    return <LoadingScreen onComplete={handleComplete} />;
}

export default Page_Loading;