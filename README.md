confReserve
===========


<a href="https://github.com/demakoff/confReserve/blob/master/app.js">app.js</a> - server side index-file.<br/>
<a href="https://github.com/demakoff/confReserve/blob/master/public/index.html">public/index.html</a> - client-side index-file.

Service is based on REST principles and supports next client-requests:<br/>

<b>1. Authorization</b><br/>

<b>Request:</b> POST /login 	(body: {"uid":useruid, "password":userpassword})<br/>
<b>Response:</b> if successful: 200, OK<br/>
		if failed: error.code, error.message<br/>

<b>2. Get all reservations</b><br/>

<b>Request:</b> GET /reservations<br/>
<b>Response:</b> if successful: JSON in the next format: <br/>
  {<br/>
	"roomId": roomId,<br/>
	"date": startdate,<br/>
	"userId": userUid,<br/>
	"endDate": endDate    <br/>
  }<br/>
		if failed: error.code, error.message<br/>

<b>3. Create new reservation</b>

<b>Request:</b> POST /reservations 	(body: <br/>
{<br/>
	"roomId": roomId,<br/>
	"date": startdate,	<br/>
	"endDate": endDate    <br/>
})<br/>
<b>Response:</b> if successful: 200, OK<br/>
		if failed: error.code, error.message<br/>

<b>4. Remove reservation</b>

<b>Request:</b> DELETE /reservations 	(body: <br/>
{<br/>
	"roomId": roomId,<br/>
	"date": startdate<br/>
})<br/>
<b>Response:</b> if successful: 200, OK<br/>
		if failed: error.code, error.message<br/>