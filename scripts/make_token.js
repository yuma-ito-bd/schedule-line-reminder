import { makeJWT } from "./lib/jwt-helper.js";

const createToken = async (jwt) => {
  const accessTokenUrl = "https://api.line.me/oauth2/v2.1/token";
  const response = await fetch(accessTokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_assertion_type:
        "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      client_assertion: jwt,
    }).toString(),
  });

  return response;
};

(async () => {
  const jwt = await makeJWT();
  const accessTokenResponse = await createToken(jwt);
  console.log(await accessTokenResponse.json());
})();
