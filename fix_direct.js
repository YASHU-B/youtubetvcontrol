const admin = require('firebase-admin');

const serviceAccount = {
    "type": "service_account",
    "project_id": "youtube-tv-control-2026",
    "private_key_id": "c588c0a3c0e332ae3cf042f20cdac12542d7117f",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDSjC2XpABCa3Hc\n0rgedSRbft++e2hqseJMd6lOXBkAoMKFuXF1MFfZYS5xhX8YxhOvAIu78WcpLPRm\neoPwzjxBWJsIKyoxkMx5okK1Nw5ZsYP6kMPypVQY69Pco7r7QpMocyoCU5fUtQG4\n06f1rWjH3QF+jJuJC2XHi2RxFftiOGdcns0xj1fmvSS2F1b0lT4fKUre8jkmIDdL\nFzQN7EWG/CwgoPbCLYcYsz5w1O9NAw0Iicp5EiScfDllG3NgebWdNCYsGa80BwLA\nke1xb+FiZPxa7BJxf7eU8QESt/sdjOvbXTSJdijC+W41dSoWhwPIXM1mw2mhwabD\nK4Ld8n6bAgMBAAECggEAWDGXt3lfEnNnUpSBw2BWRm0y09tltaulm1pUdRpm7rho\nQxOWzvvdEJWAmtTMlFgETr3vyl4oVDscdQDE283Ht6eh6R4Loo+A10J8puPVAwU0\nv3R8X9uZCodeS4HaBP2yHrN+2VKiutrHSeB+7o4g4fdVdOj5DcLUc22UOTp3/n/X\naAx0bQr/K8cr8aWbwrmC2Ff5dMeO4RQBmzTOZ/ExoW4OmuG5qpj+9pHdKfjSoR6a\nqoohD2pmXsRkxwl6ey6cmffIRe7WrOGBQYDrF5GVEArpqZ8Zr60aGcSBscU7z3Nf\nV8fnJsf6SiKp1/NGD8VStiV47f+m9EGsJp9bU5G3wQKBgQDrKZRjArLxeE3F/X6S\nIVCfvlDCy5kvhGX9unZrYxxmI5WcWvxhhweF3SlbApTwH8hPh7Zlr60r4qOMkSQ5\Pa/Lc++gciMLQ/vguufcyqcVhuFZRUN4Tve35K4JL+MgVGP8OjeIwKNHfXtT4dhO\nk3H2RlN/JbRjW3IO6pCigG43iQKBgQDlNDxR2TjeVGoATa0fUMaP9m+MZUCbvFVy\n1H6GrIgXBIIzoO9nki9tcryyC4gh2VOyaf1mHXoa2I6ZQAHOekmsm74HmBobwKs/\niW4ds9Vl+NVZQo/9VLaI0bvnmfRShGI0fvLgWsFWmih1d4+YwFZFF5OEKOHE2UXa\nidQwzBsYAwKBgBxbnEBAUBHcXwyUIBJBIDbTPWvwH13iimYJeURD5GXQvrbnJe4g\n2WBkJhuKeSlnu8ETbYRfpfNX1j8aNZMNhEh1h50ChoVSQmp8P3+ZlIJ9DGm2d4dn\nhmnPkska1DnO02vUHWRJTqdNU3TvFCWNlD2Nh34aruEYYu23jY97C095AoGBAMU7\nROi9vsT66Nhn/yCidqttSaILgyRAVVth5ZroHpeIBq58v2ZlkjBhemTPrY5LIE24\nDRjxJqCxV0wimytdacaBom2Qgm79RZ+AGGSw2mJMVPLhZ1x8qDJmIIb0oRzc1FEO\nKNvM3PAz6brjborof5Qm7IbeUyD8QrMCxbhT+sCXAoGAZE2pwZ1ZBvSJ5nrnJLUQ\n/6dFjG13jh8VNV99LOZWVlAA2A+6iY+04x+BhRPxILZglmfHAs4Go6dLi9vCkJx4\nuDSuAxi0Y2HEnVkXclCCy+BjKhauB4UkaHzSaKE0VzEIZcbNR6hDZswLvkxTdhZI\nBByDy2ymgecrt+Su+79g/Us=\n-----END PRIVATE KEY-----\n".replace(/\\n/g, '\n'),
    "client_email": "firebase-adminsdk-fbsvc@youtube-tv-control-2026.iam.gserviceaccount.com",
    "client_id": "117522258383527838562",
};

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: "youtube-tv-control-2026"
    });
}

const db = admin.firestore();

async function run() {
    await db.collection('channels').doc('main').update({
        mediaType: 'direct'
    });
    console.log("Updated channels/main to direct media type");
}

run().catch(console.error);
