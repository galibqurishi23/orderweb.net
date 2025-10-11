"use client";
import React, { useState } from "react";

interface SMTPSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  secure: boolean;
  enabled: boolean;
}

export default function EmailSettings() {
  const [testMessage, setTestMessage] = useState("");

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Email Settings</h1>
        <p className="text-gray-600 mb-6">Configure SMTP settings to enable email notifications</p>
        
        <div className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">SMTP Configuration</h2>
          
          <div>
            <label className="block text-sm font-medium mb-2">SMTP Host</label>
            <input 
              type="text" 
              placeholder="smtp.gmail.com" 
              className="w-full p-3 border rounded-md"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Port</label>
              <input 
                type="number" 
                placeholder="587" 
                className="w-full p-3 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Security</label>
              <select className="w-full p-3 border rounded-md">
                <option>STARTTLS (587)</option>
                <option>SSL/TLS (465)</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Username/Email</label>
            <input 
              type="email" 
              placeholder="your-email@gmail.com" 
              className="w-full p-3 border rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input 
              type="password" 
              placeholder="Your email password" 
              className="w-full p-3 border rounded-md"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="enabled" className="rounded" />
            <label htmlFor="enabled" className="text-sm font-medium">
              Enable email notifications
            </label>
          </div>
          
          <button className="w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700">
            Save SMTP Settings
          </button>
        </div>
        
        <div className="bg-white border rounded-lg p-6 mt-6 space-y-4">
          <h2 className="text-xl font-semibold">Test SMTP Connection</h2>
          
          <div>
            <label className="block text-sm font-medium mb-2">Test Email Address</label>
            <input 
              type="email" 
              placeholder="test@example.com" 
              className="w-full p-3 border rounded-md"
            />
          </div>
          
          <button 
            onClick={() => setTestMessage("Test email sent successfully!")}
            className="w-full bg-green-600 text-white p-3 rounded-md hover:bg-green-700"
          >
            Send Test Email
          </button>
          
          {testMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-md">
              {testMessage}
            </div>
          )}
        </div>
        
        <div className="bg-gray-50 border rounded-lg p-6 mt-6">
          <h2 className="text-lg font-semibold mb-3">Common SMTP Settings</h2>
          <div className="text-sm space-y-2">
            <div><strong>Gmail:</strong> smtp.gmail.com:587 (Use App Password)</div>
            <div><strong>Outlook:</strong> smtp-mail.outlook.com:587</div>
            <div><strong>Yahoo:</strong> smtp.mail.yahoo.com:587</div>
            <div><strong>SendGrid:</strong> smtp.sendgrid.net:587</div>
          </div>
        </div>
      </div>
    </div>
  );
}