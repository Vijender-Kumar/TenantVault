const genericMails = (type, data) => {
  switch (type) {
    case "createtenantuser":
      return `<div>Hi ${data.username},<br><br>
            Welcome to the Tenant Vault Dashborad.<br>
            PFB, the dashboard credentials.<br><br>
            <label><b>URL : </b></label>${process.env.TENANT_VAULT_DASH_URL}<br>
            ${
              data.email
                ? `<label><b>email : </b></label>${data.email}<br>`
                : ""
            }
            <label><b>username : </b></label>${data.username}<br>
            <label><b>password : </b></label>${data.userpassToEmail}<br><br>
            </div>`;
      break;
    case "passwordresetfortenant":
      return `<div>Hi ${data.username},<br><br>
            Your password successfully changed.<br>
            PFB, the new credentials for tenant vault dashboard.<br><br>
            <label><b>URL : </b></label>${process.env.TENANT_VAULT_DASH_URL}<br>
            ${
              data.email
                ? `<label><b>email : </b></label>${data.email}<br>`
                : ""
            }
            <label><b>username : </b></label>${data.username}<br>
            <label><b>password : </b></label>${data.confirmPassword}<br><br>
            Regards,<br>
            ARTHMATETECH PRIVATE LIMITED</div>`;
      break;
    case "passwordresetforadmin":
      return `<div>Hi ${data.username},<br><br>
            Your password successfully changed.<br>
            PFB, the new Admin credentials for tenant vault dashboard.<br><br>
            <label><b>URL : </b></label>${process.env.TENANT_VAULT_DASH_URL}<br>
            <label><b>email : </b></label>${data.email}<br>
            <label><b>username : </b></label>${data.username}<br>
            <label><b>password : </b></label>${data.confirmPassword}<br><br>
            Regards,<br>
            ARTHMATETECH PRIVATE LIMITED</div>`;
      break;
    default:
      break;
  }
};

module.exports = {
  genericMails,
};
