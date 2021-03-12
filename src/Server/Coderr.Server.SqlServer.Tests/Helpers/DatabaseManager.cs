﻿using System;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Diagnostics;
using System.Threading;
using Coderr.Server.Abstractions;
using Coderr.Server.SqlServer.Migrations;
using Coderr.Server.SqlServer.Schema;
using Griffin.Data;
using Griffin.Data.Mapper;

namespace Coderr.Server.SqlServer.Tests.Helpers
{
    /// <summary>
    ///     Purpose of this class is to create and dispose the database.
    /// </summary>
    public class DatabaseManager : IDisposable
    {
        private static int InstanceCounter = 1;
        private readonly string _databaseName;
        private bool _deleted;
        private readonly string _masterConString;

        public DatabaseManager(string databaseName = null, Func<string> connectionStringTemplateProvider = null)
        {
            if (connectionStringTemplateProvider == null)
            {
                connectionStringTemplateProvider = () =>
                {
                    var conString = HostConfig.Instance.ConnectionString;
                    if (conString == null)
                        throw new ConfigurationErrorsException("Failed to find connectionstring 'Db'.");
                    return HostConfig.Instance.ConnectionString;
                };
            }

            var instanceId = Interlocked.Increment(ref InstanceCounter);
            _databaseName = databaseName ?? $"coderrTest{DateTime.Now:MMddHHmmss}_{instanceId}";

            ConnectionString = connectionStringTemplateProvider()
                .Replace("{databaseName}", _databaseName);
            _masterConString = connectionStringTemplateProvider()
                .Replace("{databaseName}", "master");
            UpdateToLatestVersion = true;
        }

        public string ConnectionString { get; }

        public bool UpdateToLatestVersion { get; set; }

        public void Dispose()
        {
            if (_deleted)
                return;
            DeleteDatabase();
            _deleted = true;
        }

        public void CreateEmptyDatabase()
        {
            Debug.WriteLine("*****DBNAME: " + ConnectionString);
            //var builder = new SqlConnectionStringBuilder(ConnectionString);
            Environment.SetEnvironmentVariable("coderr_ConnectionString", ConnectionString);

            using (var con = OpenConnection(_masterConString))
            {
                con.ExecuteNonQuery("CREATE Database " + _databaseName);
            }
        }

        public AdoNetUnitOfWork CreateUnitOfWork()
        {
            return new AdoNetUnitOfWork(OpenConnection(), true);
        }

        public void DeleteDatabase()
        {
            using (var con = OpenConnection(_masterConString))
            {
                var sql =
                    string.Format("alter database {0} set single_user with rollback immediate; DROP Database {0}",
                        _databaseName);
                con.ExecuteNonQuery(sql);
            }
        }

        private bool _invoked = false;
        public void InitSchema()
        {
            if (_invoked)
                throw new InvalidOperationException("Already invoked.");
            _invoked = true;
            try
            {
                var schemaManager = new MigrationRunner(OpenConnection, "Coderr", typeof(CoderrMigrationPointer).Namespace);
                schemaManager.Run();
            }
            catch (SqlException ex)
            {
                throw new DataException(_databaseName + " [" + ConnectionString + "] schema init failed.", ex);
            }
        }

        public IDbConnection OpenConnection()
        {
            return OpenConnection(ConnectionString);
        }

        public void UpdateSchema(int version)
        {
            var mgr = new MigrationRunner(OpenConnection, "Coderr", typeof(CoderrMigrationPointer).Namespace);
            mgr.Run();
        }

        private IDbConnection OpenConnection(string connectionString)
        {
            var connection = new SqlConnection
            {
                ConnectionString = connectionString
            };
            connection.Open();
            return connection;
        }
    }
}