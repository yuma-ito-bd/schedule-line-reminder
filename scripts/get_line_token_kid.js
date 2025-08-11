import { makeJWT } from "./lib/jwt-helper.js";

const getTokenKid = async (jwt) => {
  const tokenKidUrl = "https://api.line.me/oauth2/v2.1/tokens/kid";
  
  // URLSearchParamsを使用してクエリパラメータを構築
  const params = new URLSearchParams({
    client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: jwt,
  });

  // GETリクエストでクエリパラメータを送信
  const response = await fetch(`${tokenKidUrl}?${params.toString()}`);

  return response;
};

(async () => {
  try {
    const jwt = await makeJWT();
    console.log("JWT generated successfully");
    console.log("JWT length:", jwt.length);
    
    const tokenKidResponse = await getTokenKid(jwt);
    console.log("Response status:", tokenKidResponse.status);
    console.log("Response headers:", Object.fromEntries(tokenKidResponse.headers.entries()));
    
    if (tokenKidResponse.ok) {
      const responseData = await tokenKidResponse.json();
      console.log("Response data:", responseData);
    } else {
      const errorText = await tokenKidResponse.text();
      console.error("Error response:", errorText);
    }
  } catch (error) {
    console.error("Error:", error);
  }
})();
